from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from app.auth import (
    RegisterView,
    CustomerLoginView,
    StaffLoginView,
    AdminLoginView,
    SuperuserLoginView,
    LogoutView,
    MeView,
)
from app.api_view import ProductViewSet, CartViewSet, OrderViewSet

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", CustomerLoginView.as_view(), name="customer-login"),
    path("auth/staff/login/", StaffLoginView.as_view(), name="staff-login"),
    path("auth/admin/login/", AdminLoginView.as_view(), name="admin-login"),
    path("auth/superuser/login/", SuperuserLoginView.as_view(), name="superuser-login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("api/", include(router.urls)),
    path("api/cart/", CartViewSet.as_view({"get": "list"}), name="cart"),
    path("api/cart/add/", CartViewSet.as_view({"post": "add"}), name="cart-add"),
    path("api/cart/items/<int:item_id>/", CartViewSet.as_view({"patch": "update_item", "delete": "remove_item"}), name="cart-item"),
    path("api/cart/clear/", CartViewSet.as_view({"delete": "clear"}), name="cart-clear"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
