from rest_framework import serializers
from app.models import Product, Cart, CartItem, Order, OrderItem, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "is_primary", "sort_order"]


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    primary_image_url = serializers.CharField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "sku",
            "description",
            "short_description",
            "price",
            "compare_at_price",
            "currency",
            "stock_quantity",
            "status",
            "is_featured",
            "is_digital",
            "is_available",
            "is_in_stock",
            "primary_image_url",
            "images",
            "category",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(status=Product.Status.ACTIVE),
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

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_price", "total_price"]
        read_only_fields = ["id", "product_name", "sku", "unit_price", "total_price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "subtotal",
            "shipping_cost",
            "tax_amount",
            "discount",
            "total",
            "currency",
            "shipping_address",
            "billing_address",
            "notes",
            "items",
            "created_at",
            "updated_at",
            "paid_at",
        ]
        read_only_fields = [
            "id",
            "order_number",
            "subtotal",
            "total",
            "created_at",
            "updated_at",
            "paid_at",
        ]
