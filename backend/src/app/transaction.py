# shop/payment.py  (updated webhook + initiation helpers)
import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction, IntegrityError
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.contrib.auth.decorators import login_required

from .models import Transaction, Order

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Safe Transaction creation (prevents duplicate pending charges)
# ---------------------------------------------------------------------------
def create_pending_transaction(user, order: Order, amount: Decimal, currency: str = "NGN") -> Transaction:
    """
    Create a pending Transaction for an Order.

    Guarantees:
    - Only ONE pending transaction exists per order at any time.
    - Race-safe via select_for_update + unique constraint on (order, status=pending).
    """
    with transaction.atomic():
        # Lock the order row
        order = Order.objects.select_for_update().get(pk=order.pk)

        # Reject if order is already paid / cancelled
        if order.status in (Order.Status.PAID, Order.Status.CANCELLED):
            raise ValueError(f"Order {order.pk} is already {order.status}")

        # Cancel any existing pending transactions for this order
        Transaction.objects.filter(
            order=order,
            status=Transaction.Status.PENDING,
        ).update(status=Transaction.Status.FAILED)

        # Create new pending transaction with unique reference
        reference = f"ORD-{order.pk}-{uuid.uuid4().hex[:12].upper()}"

        tx = Transaction.objects.create(
            user=user,
            order=order,
            reference=reference,
            amount=amount,
            currency=currency,
            status=Transaction.Status.PENDING,
        )
        return tx


# ---------------------------------------------------------------------------
# 2. Webhook – fully race-condition safe & idempotent
# ---------------------------------------------------------------------------
@csrf_exempt
@require_POST
def payment_webhook(request):
    """
    Flutterwave webhook handler.

    Protections against overcharge / double-processing:
    - Verif-Hash validation
    - select_for_update() on Transaction
    - Explicit status check (only PENDING → PAID)
    - Optional amount verification
    - Atomic update of both Transaction and Order
    """
    signature = request.headers.get("Verif-Hash")
    if not signature or signature != getattr(settings, "FLW_SECRET_HASH", None):
        logger.warning("Webhook rejected: invalid Verif-Hash")
        return HttpResponse(status=401)

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, TypeError, ValueError):
        return HttpResponse(status=400)

    # Support both top-level and nested data payloads
    data = payload.get("data", payload)
    status = data.get("status") or payload.get("status")
    tx_ref = data.get("tx_ref") or payload.get("tx_ref")

    if not tx_ref:
        return HttpResponse(status=400)

    with transaction.atomic():
        try:
            tx = (
                Transaction.objects
                .select_for_update()          # ← locks the row
                .select_related("order")
                .get(reference=tx_ref)
            )
        except Transaction.DoesNotExist:
            logger.warning("Webhook: unknown reference %s", tx_ref)
            return HttpResponse(status=404)

        # ---- IDEMPOTENCY GUARD ----
        # If already paid, do nothing (prevents double charge)
        if tx.status == Transaction.Status.PAID:
            logger.info("Webhook: %s already PAID – ignoring", tx_ref)
            return HttpResponse(status=200)

        # Only process successful payments that are still PENDING
        if status == "successful" and tx.status == Transaction.Status.PENDING:
            # Optional: amount integrity check
            received = data.get("amount")
            if received is not None:
                try:
                    if Decimal(str(received)) != tx.amount:
                        logger.error(
                            "Amount mismatch for %s: expected %s, got %s",
                            tx_ref, tx.amount, received
                        )
                        return HttpResponse(status=400)
                except Exception:
                    pass

            # Mark transaction paid
            tx.status = Transaction.Status.PAID
            tx.gateway_response = payload
            tx.save(update_fields=["status", "gateway_response", "updated_at"])

            # Mark order paid (only if still pending)
            if tx.order and tx.order.status == Order.Status.PENDING:
                tx.order.status = Order.Status.PAID
                tx.order.save(update_fields=["status", "updated_at"])

            logger.info("Webhook: %s → PAID (order %s)", tx_ref, tx.order_id)

        elif status in ("failed", "cancelled") and tx.status == Transaction.Status.PENDING:
            tx.status = Transaction.Status.FAILED
            tx.gateway_response = payload
            tx.save(update_fields=["status", "gateway_response", "updated_at"])
            logger.info("Webhook: %s → FAILED", tx_ref)

    return HttpResponse(status=200)


# ---------------------------------------------------------------------------
# 3. Example initiation endpoint (call this before redirecting to Flutterwave)
# ---------------------------------------------------------------------------
@login_required
@require_http_methods(["POST"])
def initiate_payment(request, order_id):
    """
    Creates a single pending Transaction for the order and returns the
    reference that should be sent to Flutterwave as tx_ref.
    """
    try:
        order = Order.objects.get(pk=order_id, user=request.user)
    except Order.DoesNotExist:
        return JsonResponse({"detail": "Order not found"}, status=404)

    if order.status != Order.Status.PENDING:
        return JsonResponse(
            {"detail": f"Order is already {order.status}"},
            status=400,
        )

    try:
        tx = create_pending_transaction(
            user=request.user,
            order=order,
            amount=order.total,
            currency="NGN",
        )
    except ValueError as e:
        return JsonResponse({"detail": str(e)}, status=400)
    except IntegrityError:
        # Extremely rare – unique constraint on reference
        return JsonResponse({"detail": "Could not create transaction"}, status=500)

    return JsonResponse({
        "reference": tx.reference,
        "amount": str(tx.amount),
        "currency": tx.currency,
        "order_id": order.id,
    })