from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User,
    Category,
    Product,
    ProductImage,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Transaction,
    CustomerLog,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "is_staff", "is_admin", "is_superuser", "created_at")
    search_fields = ("email", "username", "telephone_no")
    ordering = ("-created_at",)
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {"fields": ("telephone_no", "country", "city", "role", "is_admin", "profile_image")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {"fields": ("email", "telephone_no")}),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active")
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "price", "status", "stock_quantity", "is_featured")
    list_filter = ("status", "is_featured", "category")
    search_fields = ("name", "sku")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "status", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("order_number", "user__email")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "user", "type", "status", "amount", "provider", "created_at")
    list_filter = ("status", "type", "provider")


@admin.register(CustomerLog)
class CustomerLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "ip_address", "created_at")
    list_filter = ("action",)
    readonly_fields = ("user", "action", "description", "ip_address", "user_agent", "metadata", "created_at")
