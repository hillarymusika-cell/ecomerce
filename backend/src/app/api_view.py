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
from . import cache_utils

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

    def list(self, request, *args, **kwargs):
        """Cache public category lists; staff always hits DB."""
        user = request.user
        is_staff = user.is_authenticated and (
            user.is_staff or user.is_admin or user.is_superuser
        )
        if is_staff:
            return super().list(request, *args, **kwargs)

        key = cache_utils.category_list_key(public=True)

        def loader():
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                ser = self.get_serializer(page, many=True)
                return {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "results": ser.data,
                    "_paginated": True,
                }
            ser = self.get_serializer(qs, many=True)
            return {"results": ser.data, "_paginated": False}

        payload = cache_utils.get_or_set(
            key, loader, cache_utils._ttl("category"), lock=True
        )
        if payload.get("_paginated"):
            return Response(
                {
                    "count": payload["count"],
                    "next": payload["next"],
                    "previous": payload["previous"],
                    "results": payload["results"],
                }
            )
        return Response(payload["results"])


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

    def _is_staff_user(self):
        user = self.request.user
        return user.is_authenticated and (
            user.is_staff or user.is_admin or user.is_superuser
        )

    def list(self, request, *args, **kwargs):
        """Cache-aside for public product listings (query-aware keys)."""
        if self._is_staff_user() or request.query_params.get("all"):
            return super().list(request, *args, **kwargs)

        params = {
            k: request.query_params.get(k)
            for k in (
                "search",
                "category",
                "featured",
                "min_price",
                "max_price",
                "ordering",
                "page",
                "page_size",
            )
            if request.query_params.get(k) is not None
        }
        key = cache_utils.product_list_key(params)

        def loader():
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                ser = self.get_serializer(page, many=True)
                return {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "results": ser.data,
                    "_paginated": True,
                }
            ser = self.get_serializer(qs, many=True)
            return {"results": ser.data, "_paginated": False}

        payload = cache_utils.get_or_set(
            key, loader, cache_utils._ttl("product_list"), lock=True
        )
        if payload.get("_paginated"):
            return Response(
                {
                    "count": payload["count"],
                    "next": payload["next"],
                    "previous": payload["previous"],
                    "results": payload["results"],
                }
            )
        return Response(payload["results"])

    def retrieve(self, request, *args, **kwargs):
        """Cache-aside product detail by slug (public reads)."""
        if self._is_staff_user():
            return super().retrieve(request, *args, **kwargs)

        slug = kwargs.get("slug") or kwargs.get(self.lookup_field)
        key = cache_utils.product_detail_key(slug)

        def loader():
            instance = self.get_object()
            return self.get_serializer(instance).data

        data = cache_utils.get_or_set(
            key, loader, cache_utils._ttl("product"), lock=True
        )
        return Response(data)
