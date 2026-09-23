from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from app.auth import (
    RegisterView,
    LoginView,
    CustomerLoginView,
    StaffLoginView,
    AdminLoginView,
    SuperuserLoginView,
    LogoutView,
    MeView,
    ChangePasswordView,
    AuthTokenRefreshView,
)
from app.api_view import (
    ProductViewSet,
    CartViewSet,
    OrderViewSet,
    CategoryViewSet,
    AdminDashboardView,
    StaffDashboardView,
    AdminUserViewSet,
    AdminOrderViewSet,
    HealthCheckView,
)
from app.transaction import payment_webhook, initiate_payment

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"categories", CategoryViewSet, basename="category")

admin_router = DefaultRouter()
admin_router.register(r"users", AdminUserViewSet, basename="admin-user")
admin_router.register(r"orders", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthCheckView.as_view(), name="health"),
    # Auth
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/customer/login/", CustomerLoginView.as_view(), name="customer-login"),
    path("auth/staff/login/", StaffLoginView.as_view(), name="staff-login"),
    path("auth/admin/login/", AdminLoginView.as_view(), name="admin-login"),
    path("auth/superuser/login/", SuperuserLoginView.as_view(), name="superuser-login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("auth/token/refresh/", AuthTokenRefreshView.as_view(), name="token-refresh"),
    path("api/token/refresh/", AuthTokenRefreshView.as_view(), name="token-refresh-api"),
    # Catalog + cart + orders
    path("api/", include(router.urls)),
    path("api/cart/", CartViewSet.as_view({"get": "list"}), name="cart"),
    path("api/cart/add/", CartViewSet.as_view({"post": "add"}), name="cart-add"),
    path(
        "api/cart/items/<int:item_id>/",
        CartViewSet.as_view({"patch": "update_item", "delete": "remove_item"}),
        name="cart-item",
    ),
    path("api/cart/clear/", CartViewSet.as_view({"delete": "clear"}), name="cart-clear"),
    # Admin / staff analytics
    path("api/admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("api/staff/dashboard/", StaffDashboardView.as_view(), name="staff-dashboard"),
    path("api/admin/", include(admin_router.urls)),
    # Payments
    path("api/payments/webhook/", payment_webhook, name="payment-webhook"),
    path(
        "api/orders/<int:order_id>/pay/",
        initiate_payment,
        name="initiate-payment",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
