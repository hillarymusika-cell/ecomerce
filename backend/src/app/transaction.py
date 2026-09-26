"""
Order payments – Flutterwave card checkout + optional demo confirm.

Flow:
  1. POST /api/orders/{id}/pay/          → pending Transaction + client config
  2. Customer pays via Flutterwave (card) OR demo confirm when enabled
  3. POST /api/orders/{id}/pay/confirm/  → verify / mark paid
  4. POST /api/payments/webhook/         → Flutterwave server callback (idempotent)
"""

from __future__ import annotations

import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction, IntegrityError
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transaction, Order

logger = logging.getLogger(__name__)


def create_pending_transaction(
    user, order: Order, amount: Decimal, currency: str = "USD"
) -> Transaction:
    """Create a pending Transaction for an Order (one pending at a time)."""
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)

        if order.status in (Order.Status.PAID, Order.Status.CANCELLED, Order.Status.REFUNDED):
            raise ValueError(f"Order is already {order.status}")

        Transaction.objects.filter(
            order=order,
            status=Transaction.Status.PENDING,
        ).update(status=Transaction.Status.FAILED)

        tx_id = f"TXN-{order.pk}-{uuid.uuid4().hex[:12].upper()}"

        return Transaction.objects.create(
            user=user,
            order=order,
            transaction_id=tx_id,
            type=Transaction.Type.PAYMENT,
            amount=amount,
            currency=currency,
            status=Transaction.Status.PENDING,
            provider=Transaction.Provider.FLUTTERWAVE,
        )


def _payments_demo_enabled() -> bool:
    return str(getattr(settings, "PAYMENTS_DEMO", "") or "").lower() in (
        "1",
        "true",
        "yes",
    )


def _flw_public_key() -> str:
    return (getattr(settings, "FLW_PUBLIC_KEY", None) or "").strip()


def _flw_secret_key() -> str:
    return (getattr(settings, "FLW_SECRET_KEY", None) or "").strip()


class InitiatePaymentView(APIView):
    """Start card payment for a pending order (JWT)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        try:
            order = Order.objects.get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.status != Order.Status.PENDING:
            return Response(
                {"detail": f"Order is already {order.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tx = create_pending_transaction(
                user=request.user,
                order=order,
                amount=order.total,
                currency=order.currency or "USD",
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {"detail": "Could not create transaction."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        public_key = _flw_public_key()
        demo = _payments_demo_enabled() or not public_key

        return Response(
            {
                "reference": tx.transaction_id,
                "amount": str(tx.amount),
                "currency": tx.currency,
                "order_id": order.id,
                "order_number": order.order_number,
                "customer": {
                    "email": request.user.email,
                    "name": getattr(request.user, "username", "") or request.user.email,
                },
                "public_key": public_key or None,
                "demo_mode": demo,
                "payment_options": "card",
                "redirect_url": request.data.get("redirect_url")
                or request.build_absolute_uri(f"/orders/{order.id}"),
            }
        )


class ConfirmPaymentView(APIView):
    """
    Confirm a card payment after client-side checkout.

    - With FLW_SECRET_KEY: expects flutterwave transaction_id for server verify
      (optional lightweight path; webhook remains source of truth).
    - Demo mode: marks pending transaction successful for testing without keys.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        try:
            order = Order.objects.select_related().get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        reference = (request.data.get("reference") or "").strip()
        provider_payment_id = (request.data.get("provider_payment_id") or "").strip()
        demo_confirm = str(request.data.get("demo") or "").lower() in (
            "1",
            "true",
            "yes",
        )

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)

            if order.status == Order.Status.PAID:
                return Response(
                    {
                        "detail": "Order already paid.",
                        "order_id": order.id,
                        "status": order.status,
                    }
                )

            qs = Transaction.objects.select_for_update().filter(
                order=order,
                user=request.user,
                type=Transaction.Type.PAYMENT,
            )
            if reference:
                qs = qs.filter(transaction_id=reference)
            tx = qs.order_by("-created_at").first()

            if not tx:
                return Response(
                    {"detail": "No payment transaction found. Initiate payment first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if tx.status == Transaction.Status.SUCCEEDED:
                return Response(
                    {
                        "detail": "Payment already confirmed.",
                        "reference": tx.transaction_id,
                        "order_id": order.id,
                        "status": order.status,
                    }
                )

            if tx.status != Transaction.Status.PENDING:
                return Response(
                    {"detail": f"Transaction is {tx.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Live path: store provider id; webhook should finalize.
            # Demo path: complete immediately when allowed.
            if demo_confirm or _payments_demo_enabled() or not _flw_public_key():
                if not (_payments_demo_enabled() or not _flw_public_key() or demo_confirm):
                    return Response(
                        {"detail": "Demo confirm not allowed."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                tx.provider_payment_id = provider_payment_id or f"DEMO-{uuid.uuid4().hex[:10]}"
                tx.provider_response = {
                    "mode": "demo",
                    "confirmed_by": request.user.email,
                    "at": timezone.now().isoformat(),
                }
                tx.mark_succeeded()
                order.refresh_from_db()
                return Response(
                    {
                        "detail": "Payment confirmed.",
                        "reference": tx.transaction_id,
                        "order_id": order.id,
                        "status": order.status,
                        "demo": True,
                    }
                )

            # Non-demo: attach provider reference and wait for webhook
            if provider_payment_id:
                tx.provider_payment_id = provider_payment_id
                tx.provider_response = {
                    "client_confirm": True,
                    "provider_payment_id": provider_payment_id,
                }
                tx.save(
                    update_fields=[
                        "provider_payment_id",
                        "provider_response",
                        "updated_at",
                    ]
                )

            return Response(
                {
                    "detail": "Payment submitted. Awaiting provider confirmation.",
                    "reference": tx.transaction_id,
                    "order_id": order.id,
                    "status": order.status,
                    "pending": True,
                }
            )


@csrf_exempt
@require_POST
def payment_webhook(request):
    """Flutterwave webhook (idempotent + race-safe)."""
    signature = request.headers.get("Verif-Hash")
    expected = getattr(settings, "FLW_SECRET_HASH", None) or ""
    if not expected or not signature or signature != expected:
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

            tx.provider_payment_id = str(
                data.get("id") or data.get("flw_ref") or ""
            )[:128]
            tx.provider_response = payload
            tx.mark_succeeded()
            logger.info("Webhook: %s → SUCCEEDED (order %s)", tx_ref, tx.order_id)

        elif status_str in ("failed", "cancelled") and tx.status == Transaction.Status.PENDING:
            tx.status = Transaction.Status.FAILED
            tx.provider_response = payload
            tx.save(update_fields=["status", "provider_response", "updated_at"])
            logger.info("Webhook: %s → FAILED", tx_ref)

    return HttpResponse(status=200)


# Backward-compatible name used by older imports
def initiate_payment(request, order_id):
    """Legacy function view – prefer InitiatePaymentView."""
    view = InitiatePaymentView.as_view()
    return view(request, order_id=order_id)
