from decimal import Decimal
import uuid

from django.db import transaction
from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Product, Cart, CartItem, Order, OrderItem
from serializers import (
    ProductSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list:     GET /api/products/
    retrieve: GET /api/products/{slug}/
    """
    queryset = Product.objects.filter(status=Product.Status.ACTIVE).order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class CartViewSet(viewsets.ViewSet):
    """
    list:     GET    /api/cart/
    add:      POST   /api/cart/add/
    update:   PATCH  /api/cart/items/{item_id}/
    remove:   DELETE /api/cart/items/{item_id}/
    clear:    DELETE /api/cart/clear/
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def add(self, request):
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))

        if quantity < 1:
            return Response(
                {"detail": "Quantity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id, status=Product.Status.ACTIVE)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if product.track_inventory and product.stock_quantity < quantity:
            return Response(
                {"detail": "Insufficient stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart, _ = Cart.objects.get_or_create(user=request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )

        if not created:
            item.quantity = F("quantity") + quantity
            item.save(update_fields=["quantity"])
            item.refresh_from_db()

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

        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return Response(CartItemSerializer(item).data)

    @action(detail=False, methods=["delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        try:
            item = CartItem.objects.get(id=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"])
    def clear(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        """Checkout – create order from current cart."""
        cart = Cart.objects.filter(user=request.user).first()
        if not cart or not cart.items.exists():
            return Response(
                {"detail": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            items = list(cart.items.select_related("product").select_for_update())

            if not items:
                return Response(
                    {"detail": "Your cart is empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            subtotal = Decimal("0.00")
            order_items = []

            for item in items:
                product = item.product
                if product.track_inventory and product.stock_quantity < item.quantity:
                    return Response(
                        {"detail": f"Insufficient stock for {product.name}."},
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
            )

            for oi in order_items:
                oi.order = order
            OrderItem.objects.bulk_create(order_items)

            for item in items:
                item.product.reduce_stock(item.quantity)

            cart.items.all().delete()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
