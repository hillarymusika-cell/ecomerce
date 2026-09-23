"""Admin analytics, staff dashboard, and health endpoints."""
from decimal import Decimal
import logging
from datetime import timedelta

from django.db.models import Count, F, Q, Sum, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status, viewsets, filters
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Cart, Order, OrderItem, User, Transaction
from .serializers import OrderSerializer, UserAdminSerializer
from .permissions import IsStaffUser, IsAdminUser
from . import cache_utils

logger = logging.getLogger(__name__)

PAID_STATUSES = [
    Order.Status.PAID,
    Order.Status.PROCESSING,
    Order.Status.SHIPPED,
    Order.Status.DELIVERED,
]


def _money(value):
    if value is None:
        return "0.00"
    return str(Decimal(value).quantize(Decimal("0.01")))


def _build_admin_analytics(days=30):
    now = timezone.now()
    since = now - timedelta(days=days)
    week_ago = now - timedelta(days=7)

    orders = Order.objects.all()
    paid_qs = orders.filter(status__in=PAID_STATUSES)
    paid_period = paid_qs.filter(created_at__gte=since)

    revenue = paid_qs.aggregate(t=Sum("total"))["t"] or Decimal("0")
    revenue_period = paid_period.aggregate(t=Sum("total"))["t"] or Decimal("0")
    orders_period = orders.filter(created_at__gte=since).count()
    aov = paid_qs.aggregate(a=Avg("total"))["a"] or Decimal("0")

    users_total = User.objects.count()
    customers = User.objects.filter(is_staff=False, is_admin=False, is_superuser=False).count()
    staff_count = User.objects.filter(
        Q(is_staff=True) | Q(is_admin=True) | Q(is_superuser=True)
    ).count()
    new_users_7d = User.objects.filter(created_at__gte=week_ago).count()
    new_users_30d = User.objects.filter(created_at__gte=since).count()

    products_total = Product.objects.count()
    active_products = Product.objects.filter(status=Product.Status.ACTIVE).count()
    low_stock_qs = Product.objects.filter(
        track_inventory=True,
        stock_quantity__lte=F("low_stock_threshold"),
        stock_quantity__gt=0,
    )
    out_of_stock = Product.objects.filter(
        Q(status=Product.Status.OUT_OF_STOCK)
        | Q(track_inventory=True, stock_quantity=0)
    ).count()

    status_rows = orders.values("status").annotate(count=Count("id")).order_by("status")
    orders_by_status = [{"status": r["status"], "count": r["count"]} for r in status_rows]

    daily_rev = (
        paid_period.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(revenue=Sum("total"), orders=Count("id"))
        .order_by("day")
    )
    by_day_map = {
        str(r["day"]): {
            "date": str(r["day"]),
            "revenue": _money(r["revenue"]),
            "orders": r["orders"],
        }
        for r in daily_rev
    }
    revenue_by_day = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).date()
        key = str(d)
        revenue_by_day.append(
            by_day_map.get(key, {"date": key, "revenue": "0.00", "orders": 0})
        )

    top_products = list(
        OrderItem.objects.filter(order__status__in=PAID_STATUSES)
        .values("product_id", "product_name", "sku")
        .annotate(units_sold=Sum("quantity"), revenue=Sum("total_price"))
        .order_by("-units_sold")[:10]
    )
    for row in top_products:
        row["revenue"] = _money(row["revenue"])

    top_categories = list(
        OrderItem.objects.filter(
            order__status__in=PAID_STATUSES,
            product__category__isnull=False,
        )
        .values("product__category__name", "product__category__slug")
        .annotate(units_sold=Sum("quantity"), revenue=Sum("total_price"))
        .order_by("-revenue")[:8]
    )
    for row in top_categories:
        row["name"] = row.pop("product__category__name")
        row["slug"] = row.pop("product__category__slug")
        row["revenue"] = _money(row["revenue"])

    recent = Order.objects.select_related("user").order_by("-created_at")[:8]
    recent_orders = [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "total": _money(o.total),
            "currency": o.currency,
            "user_email": o.user.email if o.user_id else None,
            "created_at": o.created_at.isoformat(),
        }
        for o in recent
    ]

    low_stock_list = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "slug": p.slug,
            "stock_quantity": p.stock_quantity,
            "low_stock_threshold": p.low_stock_threshold,
            "status": p.status,
        }
        for p in low_stock_qs.select_related("category").order_by("stock_quantity")[:15]
    ]

    tx_stats = {"total": 0, "succeeded": 0, "failed": 0, "pending": 0, "volume": "0.00"}
    try:
        tx_qs = Transaction.objects.all()
        tx_stats["total"] = tx_qs.count()
        tx_stats["succeeded"] = tx_qs.filter(status=Transaction.Status.SUCCEEDED).count()
        tx_stats["failed"] = tx_qs.filter(status=Transaction.Status.FAILED).count()
        tx_stats["pending"] = tx_qs.filter(status=Transaction.Status.PENDING).count()
        vol = tx_qs.filter(status=Transaction.Status.SUCCEEDED).aggregate(t=Sum("amount"))["t"]
        tx_stats["volume"] = _money(vol)
    except Exception:
        pass

    carts_with_items = Cart.objects.annotate(n=Count("items")).filter(n__gt=0).count()

    return {
        "users": users_total,
        "users_count": users_total,
        "customers": customers,
        "staff": staff_count,
        "products": products_total,
        "products_count": products_total,
        "active_products": active_products,
        "orders": orders.count(),
        "orders_count": orders.count(),
        "pending_orders": orders.filter(status=Order.Status.PENDING).count(),
        "revenue": _money(revenue),
        "revenue_period": _money(revenue_period),
        "orders_period": orders_period,
        "average_order_value": _money(aov),
        "low_stock": low_stock_qs.count(),
        "out_of_stock": out_of_stock,
        "new_users_7d": new_users_7d,
        "new_users_30d": new_users_30d,
        "active_carts": carts_with_items,
        "period_days": days,
        "orders_by_status": orders_by_status,
        "revenue_by_day": revenue_by_day,
        "top_products": top_products,
        "top_categories": top_categories,
        "recent_orders": recent_orders,
        "low_stock_products": low_stock_list,
        "transactions": tx_stats,
    }


def _build_staff_analytics():
    products = Product.objects.all()
    by_status = list(
        products.values("status").annotate(count=Count("id")).order_by("status")
    )
    low = Product.objects.filter(
        track_inventory=True,
        stock_quantity__lte=F("low_stock_threshold"),
        stock_quantity__gt=0,
    ).order_by("stock_quantity")[:20]
    out = Product.objects.filter(
        Q(status=Product.Status.OUT_OF_STOCK)
        | Q(track_inventory=True, stock_quantity=0)
    ).order_by("name")[:20]
    inv_value = products.filter(track_inventory=True).aggregate(
        v=Sum(F("stock_quantity") * F("price"))
    )["v"] or Decimal("0")
    return {
        "products": products.count(),
        "active_products": products.filter(status=Product.Status.ACTIVE).count(),
        "draft_products": products.filter(status=Product.Status.DRAFT).count(),
        "archived_products": products.filter(status=Product.Status.ARCHIVED).count(),
        "low_stock": Product.objects.filter(
            track_inventory=True,
            stock_quantity__lte=F("low_stock_threshold"),
            stock_quantity__gt=0,
        ).count(),
        "out_of_stock": Product.objects.filter(
            Q(status=Product.Status.OUT_OF_STOCK)
            | Q(track_inventory=True, stock_quantity=0)
        ).count(),
        "featured": products.filter(is_featured=True).count(),
        "inventory_value": _money(inv_value),
        "by_status": by_status,
        "low_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "slug": p.slug,
                "stock_quantity": p.stock_quantity,
                "low_stock_threshold": p.low_stock_threshold,
                "status": p.status,
            }
            for p in low
        ],
        "out_of_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "slug": p.slug,
                "stock_quantity": p.stock_quantity,
                "status": p.status,
            }
            for p in out
        ],
    }


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(7, min(days, 90))
        key = cache_utils.dashboard_key(days)
        data = cache_utils.get_or_set(
            key,
            lambda: _build_admin_analytics(days=days),
            cache_utils._ttl("dashboard"),
            lock=True,
        )
        return Response(data)


class StaffDashboardView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(_build_staff_analytics())


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserAdminSerializer
    http_method_names = ["get", "patch", "head", "options"]
    queryset = User.objects.all().order_by("-created_at")
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "username", "telephone_no"]
    ordering_fields = ["created_at", "email"]

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data
        if "is_active" in data:
            user.is_active = bool(data["is_active"])
        role = data.get("role") or data.get("role_label")
        if role:
            role = str(role).lower()
            if role == "admin":
                user.is_admin = True
                user.is_staff = True
                user.role = "admin"
            elif role == "staff":
                user.is_admin = False
                user.is_staff = True
                user.role = "staff"
            elif role == "customer":
                user.is_admin = False
                user.is_staff = False
                user.role = "customer"
        user.save()
        return Response(UserAdminSerializer(user).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = OrderSerializer
    http_method_names = ["get", "patch", "head", "options"]
    queryset = (
        Order.objects.select_related("user")
        .prefetch_related("items__product")
        .order_by("-created_at")
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["order_number", "user__email"]
    ordering_fields = ["created_at", "total", "status"]

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get("status")
        if new_status and new_status in Order.Status.values:
            order.status = new_status
            order.save(update_fields=["status", "updated_at"])
            return Response(OrderSerializer(order).data)
        return Response(
            {"detail": "Valid status required."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.db import connection

        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            logger.exception("Health check DB failure")

        payload = {
            "status": "ok" if db_ok else "degraded",
            "database": "up" if db_ok else "down",
        }
        code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=code)
