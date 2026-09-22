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


def create_pending_transaction(user, order: Order, amount: Decimal, currency: str = "USD") -> Transaction:
    """
    Create a pending Transaction for an Order.
    Only one pending transaction exists per order at a time.
    """
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)

        if order.status in (Order.Status.PAID, Order.Status.CANCELLED):
            raise ValueError(f"Order {order.pk} is already {order.status}")

        Transaction.objects.filter(
            order=order,
            status=Transaction.Status.PENDING,
        ).update(status=Transaction.Status.FAILED)

        tx_id = f"TXN-{order.pk}-{uuid.uuid4().hex[:12].upper()}"

        tx = Transaction.objects.create(
            user=user,
            order=order,
            transaction_id=tx_id,
            type=Transaction.Type.PAYMENT,
            amount=amount,
            currency=currency,
            status=Transaction.Status.PENDING,
            provider=Transaction.Provider.FLUTTERWAVE,
        )
        return tx


@csrf_exempt
@require_POST
def payment_webhook(request):
    """
    Flutterwave webhook handler (idempotent + race-safe).
    """
    signature = request.headers.get("Verif-Hash")
    if not signature or signature != getattr(settings, "FLW_SECRET_HASH", None):
        logger.warning("Webhook rejected: invalid Verif-Hash")
        return HttpResponse(status=401)

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, TypeError, ValueError):
        return HttpResponse(status=400)

    data = payload.get("data", payload)
    status_str = data.get("status") or payload.get("status")
    tx_ref = data.get("tx_ref") or payload.get("tx_ref")

    if not tx_ref:
        return HttpResponse(status=400)

    with transaction.atomic():
        try:
            tx = (
                Transaction.objects.select_for_update()
                .select_related("order")
                .get(transaction_id=tx_ref)
            )
        except Transaction.DoesNotExist:
            logger.warning("Webhook: unknown reference %s", tx_ref)
            return HttpResponse(status=404)

        if tx.status == Transaction.Status.SUCCEEDED:
            logger.info("Webhook: %s already SUCCEEDED – ignoring", tx_ref)
            return HttpResponse(status=200)

        if status_str == "successful" and tx.status == Transaction.Status.PENDING:
            received = data.get("amount")
            if received is not None:
                try:
                    if Decimal(str(received)) != tx.amount:
                        logger.error(
                            "Amount mismatch for %s: expected %s, got %s",
                            tx_ref,
                            tx.amount,
                            received,
                        )
                        return HttpResponse(status=400)
                except Exception:
                    pass

            tx.status = Transaction.Status.SUCCEEDED
            tx.provider_response = payload
            tx.mark_succeeded()

            logger.info("Webhook: %s → SUCCEEDED (order %s)", tx_ref, tx.order_id)

        elif status_str in ("failed", "cancelled") and tx.status == Transaction.Status.PENDING:
            tx.status = Transaction.Status.FAILED
            tx.provider_response = payload
            tx.save(update_fields=["status", "provider_response", "updated_at"])
            logger.info("Webhook: %s → FAILED", tx_ref)

    return HttpResponse(status=200)


@login_required
@require_http_methods(["POST"])
def initiate_payment(request, order_id):
    """
    Creates a pending Transaction and returns the reference for Flutterwave.
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
            currency=order.currency or "USD",
        )
    except ValueError as e:
        return JsonResponse({"detail": str(e)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "Could not create transaction"}, status=500)

    return JsonResponse({
        "reference": tx.transaction_id,
        "amount": str(tx.amount),
        "currency": tx.currency,
        "order_id": order.id,
    })
