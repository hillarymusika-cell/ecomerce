from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffUser(BasePermission):
    """Staff, admin, or superuser."""

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or u.is_admin or u.is_superuser))


class IsAdminUser(BasePermission):
    """System admin or superuser."""

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_admin or u.is_superuser))


class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_superuser)


class IsStaffOrReadOnly(BasePermission):
    """Public read; staff+ write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or u.is_admin or u.is_superuser))


def resolve_role(user):
    if not user or not user.is_authenticated:
        return "anonymous"
    if user.is_superuser or user.is_admin:
        return "admin"
    if user.is_staff:
        return "staff"
    return "customer"
