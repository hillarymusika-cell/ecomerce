# shop/api_views.py
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Cart, CartItem, Order, OrderItem
from .serializers import (
    ProductSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list:   GET  /api/products/
    retrieve: GET /api/products/{id}/
    """
    queryset = Product.objects.filter(is_available=True).order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]


class CartViewSet(viewsets.ViewSet):
    """
    retrieve: GET    /api/cart/
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
            product = Product.objects.get(id=product_id, is_available=True)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
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
    list:     GET /api/orders/
    retrieve: GET /api/orders/{id}/
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
            items = list(
                cart.items.select_related("product").select_for_update()
            )

            if not items:
                return Response(
                    {"detail": "Your cart is empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            total = sum(
                (item.product.price * item.quantity for item in items),
                Decimal("0.00"),
            )

            order = Order.objects.create(
                user=request.user,
                total=total,
                status="pending",
            )

            OrderItem.objects.bulk_create(
                [
                    OrderItem(
                        order=order,
                        product=item.product,
                        quantity=item.quantity,
                        price=item.product.price,
                    )
                    for item in items
                ]
            )

            cart.items.all().delete()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)