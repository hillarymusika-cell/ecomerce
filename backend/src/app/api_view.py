"""
API views – products, cart, orders, categories, admin.
Hardened with select_related/prefetch, atomic stock checks, and clear errors.
"""
from decimal import Decimal
import logging
import uuid
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, F, Q, Sum, Avg
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Category,
    User,
    Transaction,
)
from .serializers import (
    ProductSerializer,
    ProductWriteSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    CategorySerializer,
    UserAdminSerializer,
)
from .permissions import IsStaffUser, IsAdminUser, IsStaffOrReadOnly

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    """
    list/retrieve: public
    create/update/delete: staff+
    """
    queryset = Category.objects.filter(is_active=True).select_related("parent")
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Category.objects.select_related("parent")
        if not self.request.user.is_authenticated or not (
            self.request.user.is_staff or self.request.user.is_admin or self.request.user.is_superuser
        ):
            qs = qs.filter(is_active=True)
        return qs


class ProductViewSet(viewsets.ModelViewSet):
    """
    list/retrieve: public (active only for anon)
    create/update/delete: staff+
    """
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "description", "short_description"]
    ordering_fields = ["name", "price", "created_at", "stock_quantity"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Product.objects.select_related("category").prefetch_related("images")
        user = self.request.user
        is_staff = user.is_authenticated and (
            user.is_staff or user.is_admin or user.is_superuser
        )
        if not is_staff:
            qs = qs.filter(status=Product.Status.ACTIVE)

        # Optional query filters
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(
                Q(category__slug=category) | Q(category_id=category)
            )
        featured = self.request.query_params.get("featured")
        if featured is not None:
            qs = qs.filter(is_featured=featured.lower() in ("1", "true", "yes"))
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price:
            try:
                qs = qs.filter(price__gte=Decimal(min_price))
            except Exception:
                pass
        if max_price:
            try:
                qs = qs.filter(price__lte=Decimal(max_price))
            except Exception:
                pass
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductSerializer


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

class CartViewSet(viewsets.ViewSet):
    """
    list:     GET    /api/cart/
    add:      POST   /api/cart/add/
    update:   PATCH  /api/cart/items/{item_id}/
    remove:   DELETE /api/cart/items/{item_id}/
    clear:    DELETE /api/cart/clear/
    """
    permission_classes = [IsAuthenticated]

    def _get_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def list(self, request):
        cart = self._get_cart(request.user)
        cart = (
            Cart.objects.filter(pk=cart.pk)
            .prefetch_related("items__product__images", "items__product__category")
            .first()
        )
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def add(self, request):
        product_id = request.data.get("product_id")
        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid quantity."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1:
            return Response(
                {"detail": "Quantity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.select_for_update(of=("self",)).get(
                id=product_id, status=Product.Status.ACTIVE
            )
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            # Re-fetch under lock for stock safety
            product = Product.objects.select_for_update().get(pk=product.pk)
            if product.status != Product.Status.ACTIVE:
                return Response(
                    {"detail": "Product not available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if product.track_inventory and product.stock_quantity < quantity:
                return Response(
                    {"detail": "Insufficient stock."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cart = self._get_cart(request.user)
            item, created = CartItem.objects.select_for_update().get_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": quantity},
            )
            if not created:
                new_qty = item.quantity + quantity
                if product.track_inventory and product.stock_quantity < new_qty:
                    return Response(
                        {"detail": "Insufficient stock for requested quantity."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item.quantity = new_qty
                item.save(update_fields=["quantity", "updated_at"])

        item = CartItem.objects.select_related("product").get(pk=item.pk)
        return Response(
            CartItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=["patch"], url_path=r"items/(?P<item_id>[^/.]+)")
    def update_item(self, request, item_id=None):
        try:
            item = CartItem.objects.select_related("product").get(
                id=item_id, cart__user=request.user
            )
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        quantity = request.data.get("quantity")
        if quantity is None:
            return Response(
                {"detail": "Quantity is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid quantity."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        product = item.product
        if product.track_inventory and product.stock_quantity < quantity:
            return Response(
                {"detail": "Insufficient stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(CartItemSerializer(item).data)

    @action(detail=False, methods=["delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        deleted, _ = CartItem.objects.filter(
            id=item_id, cart__user=request.user
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"])
    def clear(self, request):
        cart = self._get_cart(request.user)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list:     GET  /api/orders/
    retrieve: GET  /api/orders/{id}/
    create:   POST /api/orders/  (checkout)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

    def create(self, request):
        """Checkout – create order from current cart (race-safe)."""
        cart = (
            Cart.objects.filter(user=request.user)
            .prefetch_related("items__product")
            .first()
        )
        if not cart or not cart.items.exists():
            return Response(
                {"detail": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipping_address = request.data.get("shipping_address") or {}
        billing_address = request.data.get("billing_address") or shipping_address
        notes = (request.data.get("notes") or "")[:2000]

        try:
            with transaction.atomic():
                items = list(
                    cart.items.select_related("product").select_for_update()
                )
                if not items:
                    return Response(
                        {"detail": "Your cart is empty."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Lock products for stock
                product_ids = [i.product_id for i in items]
                products = {
                    p.id: p
                    for p in Product.objects.select_for_update().filter(
                        id__in=product_ids
                    )
                }

                subtotal = Decimal("0.00")
                order_items = []

                for item in items:
                    product = products.get(item.product_id)
                    if not product or product.status != Product.Status.ACTIVE:
                        return Response(
                            {
                                "detail": f"Product '{item.product.name}' is no longer available."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if product.track_inventory and product.stock_quantity < item.quantity:
                        return Response(
                            {
                                "detail": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    line_total = product.price * item.quantity
                    subtotal += line_total
                    order_items.append(
                        OrderItem(
                            product=product,
                            product_name=product.name,
                            sku=product.sku,
                            quantity=item.quantity,
                            unit_price=product.price,
                            total_price=line_total,
                        )
                    )

                order_number = f"ORD-{uuid.uuid4().hex[:12].upper()}"
                order = Order.objects.create(
                    order_number=order_number,
                    user=request.user,
                    subtotal=subtotal,
                    total=subtotal,
                    status=Order.Status.PENDING,
                    shipping_address=shipping_address,
                    billing_address=billing_address,
                    notes=notes,
                )

                for oi in order_items:
                    oi.order = order
                OrderItem.objects.bulk_create(order_items)

                for item in items:
                    products[item.product_id].reduce_stock(item.quantity)

                cart.items.all().delete()

            order = (
                Order.objects.prefetch_related("items__product")
                .get(pk=order.pk)
            )
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.exception("Checkout failed for user %s", request.user.id)
            return Response(
                {"detail": "Checkout failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Admin analytics helpers
# ---------------------------------------------------------------------------

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

    # Users
    users_total = User.objects.count()
    customers = User.objects.filter(is_staff=False, is_admin=False, is_superuser=False).count()
    staff_count = User.objects.filter(
        Q(is_staff=True) | Q(is_admin=True) | Q(is_superuser=True)
    ).count()
    new_users_7d = User.objects.filter(created_at__gte=week_ago).count()
    new_users_30d = User.objects.filter(created_at__gte=since).count()

    # Products
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

    # Orders by status
    status_rows = (
        orders.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )
    orders_by_status = [
        {"status": r["status"], "count": r["count"]} for r in status_rows
    ]

    # Daily revenue + orders (last N days)
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

    # Top products by units sold (paid orders)
    top_products = list(
        OrderItem.objects.filter(order__status__in=PAID_STATUSES)
        .values("product_id", "product_name", "sku")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("total_price"),
        )
        .order_by("-units_sold")[:10]
    )
    for row in top_products:
        row["revenue"] = _money(row["revenue"])

    # Top categories
    top_categories = list(
        OrderItem.objects.filter(
            order__status__in=PAID_STATUSES,
            product__category__isnull=False,
        )
        .values("product__category__name", "product__category__slug")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("total_price"),
        )
        .order_by("-revenue")[:8]
    )
    for row in top_categories:
        row["name"] = row.pop("product__category__name")
        row["slug"] = row.pop("product__category__slug")
        row["revenue"] = _money(row["revenue"])

    # Recent orders
    recent = (
        Order.objects.select_related("user")
        .order_by("-created_at")[:8]
    )
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

    # Low stock list
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

    # Transactions summary
    tx_stats = {
        "total": 0,
        "succeeded": 0,
        "failed": 0,
        "pending": 0,
        "volume": "0.00",
    }
    try:
        tx_qs = Transaction.objects.all()
        tx_stats["total"] = tx_qs.count()
        tx_stats["succeeded"] = tx_qs.filter(status=Transaction.Status.SUCCEEDED).count()
        tx_stats["failed"] = tx_qs.filter(status=Transaction.Status.FAILED).count()
        tx_stats["pending"] = tx_qs.filter(status=Transaction.Status.PENDING).count()
        vol = tx_qs.filter(status=Transaction.Status.SUCCEEDED).aggregate(
            t=Sum("amount")
        )["t"]
        tx_stats["volume"] = _money(vol)
    except Exception:
        pass

    # Active carts (abandonment signal)
    carts_with_items = (
        Cart.objects.annotate(n=Count("items")).filter(n__gt=0).count()
    )

    return {
        # KPI aliases (frontend-friendly)
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
    """Inventory-focused metrics for staff."""
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
        "low_stock": low.count() if hasattr(low, "count") else len(list(low)),
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


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(7, min(days, 90))
        return Response(_build_admin_analytics(days=days))


class StaffDashboardView(APIView):
    """Inventory analytics for staff + admin."""
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


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

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
