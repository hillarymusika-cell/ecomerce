from rest_framework import serializers
from django.contrib.auth.models import User

from .models import Product, Cart, CartItem, Order, OrderItem


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "description", "price", "is_available", "created_at"]
        read_only_fields = ["id", "created_at"]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_available=True),
        source="product",
        write_only=True,
    )
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "subtotal"]
        read_only_fields = ["id", "subtotal"]

    def get_subtotal(self, obj):
        return obj.product.price * obj.quantity

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "total"]

    def get_total(self, obj):
        return sum(
            (item.product.price * item.quantity for item in obj.items.all()),
            start=0,
        )


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "price", "subtotal"]
        read_only_fields = ["id", "price", "subtotal"]

    def get_subtotal(self, obj):
        return obj.price * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "total", "status", "items", "created_at", "updated_at"]
        read_only_fields = ["id", "total", "status", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]