"""
API views - products, cart, orders, categories, admin.
Hardened with select_related/prefetch, atomic stock checks, and clear errors.
"""
from decimal import Decimal
import logging
import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    Product,
    ProductImage,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Category,
)
from .serializers import (
    ProductSerializer,
    ProductWriteSerializer,
    ProductImageSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    CategorySerializer,
)
from .permissions import IsStaffUser, IsStaffOrReadOnly

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
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
            self.request.user.is_staff
            or self.request.user.is_admin
            or self.request.user.is_superuser
        ):
            qs = qs.filter(is_active=True)
        return qs


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "description", "short_description"]
    ordering_fields = ["name", "price", "created_at", "stock_quantity"]
    ordering = ["name"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Product.objects.select_related("category").prefetch_related("images")
        user = self.request.user
        is_staff = user.is_authenticated and (
            user.is_staff or user.is_admin or user.is_superuser
        )
        if not is_staff:
            qs = qs.filter(status=Product.Status.ACTIVE)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(Q(category__slug=category) | Q(category_id=category))
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

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _is_staff(self, user):
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_admin or user.is_superuser)
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        permission_classes=[IsStaffUser],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_images(self, request, slug=None):
        """Upload one or more images. Field name: image or images."""
        product = self.get_object()
        files = request.FILES.getlist("images") or request.FILES.getlist("image")
        if not files and request.FILES.get("image"):
            files = [request.FILES["image"]]
        if not files:
            return Response(
                {"detail": "No image file provided. Use field 'image' or 'images'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        alt_text = (request.data.get("alt_text") or "")[:255]
        make_primary = str(request.data.get("is_primary", "")).lower() in (
            "1",
            "true",
            "yes",
        )
        created = []

        for f in files:
            content_type = getattr(f, "content_type", "") or ""
            if content_type and content_type not in ALLOWED_IMAGE_TYPES:
                return Response(
                    {
                        "detail": f"Unsupported type '{content_type}'. Use JPEG, PNG, WebP, or GIF."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if f.size and f.size > MAX_IMAGE_BYTES:
                return Response(
                    {"detail": "Image too large (max 5 MB)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            is_primary = make_primary and not created
            if not product.images.exists() and not created:
                is_primary = True

            img = ProductImage(
                product=product,
                alt_text=alt_text or product.name[:255],
                is_primary=is_primary,
                sort_order=product.images.count() + len(created),
            )
            img.image = f
            img.save()
            created.append(img)

        ser = ProductImageSerializer(
            created, many=True, context={"request": request}
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>[0-9]+)",
        permission_classes=[IsStaffUser],
    )
    def delete_image(self, request, slug=None, image_id=None):
        product = self.get_object()
        try:
            img = product.images.get(pk=image_id)
        except ProductImage.DoesNotExist:
            return Response(
                {"detail": "Image not found."}, status=status.HTTP_404_NOT_FOUND
            )
        was_primary = img.is_primary
        img.image.delete(save=False)
        img.delete()
        if was_primary:
            nxt = product.images.order_by("sort_order", "id").first()
            if nxt:
                nxt.is_primary = True
                nxt.save(update_fields=["is_primary"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"images/(?P<image_id>[0-9]+)/primary",
        permission_classes=[IsStaffUser],
    )
    def set_primary_image(self, request, slug=None, image_id=None):
        product = self.get_object()
        try:
            img = product.images.get(pk=image_id)
        except ProductImage.DoesNotExist:
            return Response(
                {"detail": "Image not found."}, status=status.HTTP_404_NOT_FOUND
            )
        img.is_primary = True
        img.save()
        ser = ProductImageSerializer(img, context={"request": request})
        return Response(ser.data)


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

class CartViewSet(viewsets.ViewSet):
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
        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=False, methods=["post"])
    def add(self, request):
        product_id = request.data.get("product_id")
        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid quantity."}, status=status.HTTP_400_BAD_REQUEST
            )
        if quantity < 1:
            return Response(
                {"detail": "Quantity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            product = Product.objects.get(
                id=product_id, status=Product.Status.ACTIVE
            )
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        with transaction.atomic():
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
            CartItemSerializer(item, context={"request": request}).data,
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
                {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
            )
        quantity = request.data.get("quantity")
        if quantity is None:
            return Response(
                {"detail": "Quantity is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid quantity."}, status=status.HTTP_400_BAD_REQUEST
            )
        if quantity <= 0:
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        product = item.product
        if product.track_inventory and product.stock_quantity < quantity:
            return Response(
                {"detail": "Insufficient stock."}, status=status.HTTP_400_BAD_REQUEST
            )
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(
            CartItemSerializer(item, context={"request": request}).data
        )

    @action(detail=False, methods=["delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        deleted, _ = CartItem.objects.filter(
            id=item_id, cart__user=request.user
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
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

class OrderViewSet(viewsets.ModelViewSet):
    """Customer orders: list/retrieve + create from cart."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

    def create(self, request):
        cart = (
            Cart.objects.filter(user=request.user)
            .prefetch_related("items__product")
            .first()
        )
        if not cart or not cart.items.exists():
            return Response(
                {"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST
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
                    if (
                        product.track_inventory
                        and product.stock_quantity < item.quantity
                    ):
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
            order = Order.objects.prefetch_related("items__product").get(pk=order.pk)
            return Response(
                OrderSerializer(order, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            logger.exception("Checkout failed for user %s", request.user.id)
            return Response(
                {"detail": "Checkout failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
