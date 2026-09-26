from decimal import Decimal

from rest_framework import serializers

from .models import (
    Product,
    ProductImage,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Category,
    User,
)


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "url", "alt_text", "is_primary", "sort_order"]
        read_only_fields = ["id", "url"]

    def get_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        try:
            url = obj.image.url
        except ValueError:
            return None
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    primary_image_url = serializers.SerializerMethodField()
    is_available = serializers.BooleanField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    category_name = serializers.CharField(
        source="category.name", read_only=True, default=None
    )

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
            "cost_price",
            "currency",
            "track_inventory",
            "stock_quantity",
            "low_stock_threshold",
            "status",
            "is_featured",
            "is_digital",
            "is_available",
            "is_in_stock",
            "primary_image_url",
            "images",
            "category",
            "category_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_primary_image_url(self, obj):
        url = obj.primary_image_url
        if not url:
            return None
        request = self.context.get("request")
        if request is not None and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "short_description",
            "price",
            "compare_at_price",
            "cost_price",
            "currency",
            "track_inventory",
            "stock_quantity",
            "low_stock_threshold",
            "status",
            "is_featured",
            "is_digital",
            "category",
        ]
        read_only_fields = ["id"]


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
            start=Decimal("0.00"),
        )


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "sku",
            "quantity",
            "unit_price",
            "total_price",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "sku",
            "unit_price",
            "total_price",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "user",
            "user_email",
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
            "user",
            "subtotal",
            "total",
            "created_at",
            "updated_at",
            "paid_at",
        ]


class UserAdminSerializer(serializers.ModelSerializer):
    role_label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "telephone_no",
            "country",
            "city",
            "role",
            "role_label",
            "is_staff",
            "is_admin",
            "is_superuser",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "username",
            "telephone_no",
            "created_at",
            "role_label",
        ]

    def get_role_label(self, obj):
        if obj.is_superuser or obj.is_admin:
            return "admin"
        if obj.is_staff:
            return "staff"
        return "customer"
