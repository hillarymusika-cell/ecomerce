from rest_framework.pagination import PageNumberPagination


class FlexiblePagination(PageNumberPagination):
    """Allow clients to request page_size (capped) for admin/staff tables."""

    page_size_query_param = "page_size"
    max_page_size = 500
