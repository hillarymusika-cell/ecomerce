"""Cache-aside mixins for catalog viewsets."""
from rest_framework.response import Response
from . import cache_utils


class CachedCategoryListMixin:
    def list(self, request, *args, **kwargs):
        user = request.user
        is_staff = user.is_authenticated and (
            user.is_staff or getattr(user, "is_admin", False) or user.is_superuser
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

        payload = cache_utils.get_or_set(key, loader, cache_utils._ttl("category"), lock=True)
        if payload.get("_paginated"):
            return Response({
                "count": payload["count"],
                "next": payload["next"],
                "previous": payload["previous"],
                "results": payload["results"],
            })
        return Response(payload["results"])


class CachedProductMixin:
    def _is_staff_user(self):
        user = self.request.user
        return user.is_authenticated and (
            user.is_staff or getattr(user, "is_admin", False) or user.is_superuser
        )

    def list(self, request, *args, **kwargs):
        if self._is_staff_user() or request.query_params.get("all"):
            return super().list(request, *args, **kwargs)
        params = {
            k: request.query_params.get(k)
            for k in ("search", "category", "featured", "min_price", "max_price", "ordering", "page", "page_size")
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

        payload = cache_utils.get_or_set(key, loader, cache_utils._ttl("product_list"), lock=True)
        if payload.get("_paginated"):
            return Response({
                "count": payload["count"],
                "next": payload["next"],
                "previous": payload["previous"],
                "results": payload["results"],
            })
        return Response(payload["results"])

    def retrieve(self, request, *args, **kwargs):
        if self._is_staff_user():
            return super().retrieve(request, *args, **kwargs)
        slug = kwargs.get("slug") or kwargs.get(self.lookup_field)
        key = cache_utils.product_detail_key(slug)

        def loader():
            return self.get_serializer(self.get_object()).data

        return Response(cache_utils.get_or_set(key, loader, cache_utils._ttl("product"), lock=True))
