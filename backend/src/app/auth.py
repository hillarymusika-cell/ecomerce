from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .geo import apply_geo_to_user, lookup_geo, client_ip
from .models import User, CustomerLog


class AuthThrottle(AnonRateThrottle):
    scope = "auth"


class AuthService:
    @staticmethod
    def get_tokens(user):
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    @staticmethod
    def log_action(user, action, request, description=""):
        CustomerLog.objects.create(
            user=user,
            action=action,
            description=description,
            ip_address=client_ip(request) or request.META.get("REMOTE_ADDR"),
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:512],
        )

    @staticmethod
    def user_payload(user):
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "telephone_no": getattr(user, "telephone_no", None),
            "country": getattr(user, "country", "") or "",
            "city": getattr(user, "city", "") or "",
            "role": user.role or "",
            "is_staff": user.is_staff,
            "is_admin": user.is_admin,
            "is_superuser": user.is_superuser,
            "profile_image": user.profile_image.url if user.profile_image else None,
        }


class BaseAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]


class RegisterView(BaseAuthView):
    def post(self, request):
        data = request.data
        email = (data.get("email") or "").strip().lower()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        telephone_no = (data.get("telephone_no") or "").strip()

        if not all([email, username, password, telephone_no]):
            return Response(
                {"error": "email, username, password and telephone_no are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already taken"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(telephone_no=telephone_no).exists():
            return Response(
                {"error": "Telephone number already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except ValidationError as e:
            return Response(
                {"error": e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Geo from IP — optional client overrides still accepted if sent
        geo = lookup_geo(client_ip(request))
        country = (data.get("country") or "").strip() or geo.get("country") or ""
        city = (data.get("city") or "").strip() or geo.get("city") or ""

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    telephone_no=telephone_no,
                    country=country[:50],
                    city=city[:50],
                    latitude=geo.get("latitude"),
                    longitude=geo.get("longitude"),
                    default_ip=geo.get("default_ip"),
                )
                AuthService.log_action(
                    user, CustomerLog.Action.REGISTER, request, "New registration"
                )

            tokens = AuthService.get_tokens(user)
            return Response(
                {
                    "message": "Registration successful",
                    "user": AuthService.user_payload(user),
                    "tokens": tokens,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


def _authenticate_user(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not email or not password:
        return None, Response(
            {"error": "email and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=email, password=password)
    if user is None:
        user = authenticate(request, email=email, password=password)

    if user is None:
        return None, Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return None, Response(
            {"error": "Account is disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    return user, None


def _login_success(request, user, message="Login successful"):
    login(request, user)
    # Backfill geo if missing (non-blocking fail-soft)
    try:
        apply_geo_to_user(user, request, overwrite=False)
    except Exception:
        pass
    AuthService.log_action(user, CustomerLog.Action.LOGIN, request)
    return Response(
        {
            "message": message,
            "user": AuthService.user_payload(user),
            "tokens": AuthService.get_tokens(user),
        },
        status=status.HTTP_200_OK,
    )


class LoginView(BaseAuthView):
    """
    Unified login for customers and staff.
    Optional body field: required_role = customer | staff | admin | superuser
    """

    def post(self, request):
        user, err = _authenticate_user(request)
        if err:
            return err

        required = (request.data.get("required_role") or "").strip().lower()

        if required == "customer":
            if user.is_staff or user.is_admin or user.is_superuser:
                return Response(
                    {"error": "Please use the staff/admin login"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif required == "staff":
            if not user.is_staff:
                return Response(
                    {"error": "You do not have staff privileges"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif required == "admin":
            if not (user.is_admin or user.is_superuser):
                return Response(
                    {"error": "You do not have admin privileges"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif required == "superuser":
            if not user.is_superuser:
                return Response(
                    {"error": "You do not have superuser privileges"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return _login_success(request, user)


class CustomerLoginView(BaseAuthView):
    def post(self, request):
        user, err = _authenticate_user(request)
        if err:
            return err
        if user.is_staff or user.is_admin or user.is_superuser:
            return Response(
                {"error": "Please use the staff/admin login endpoint"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return _login_success(request, user)


class StaffLoginView(BaseAuthView):
    def post(self, request):
        user, err = _authenticate_user(request)
        if err:
            return err
        if not user.is_staff:
            return Response(
                {"error": "You do not have staff privileges"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return _login_success(request, user, "Staff login successful")


class AdminLoginView(BaseAuthView):
    def post(self, request):
        user, err = _authenticate_user(request)
        if err:
            return err
        if not (user.is_admin or user.is_superuser):
            return Response(
                {"error": "You do not have admin privileges"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return _login_success(request, user, "Admin login successful")


class SuperuserLoginView(BaseAuthView):
    def post(self, request):
        user, err = _authenticate_user(request)
        if err:
            return err
        if not user.is_superuser:
            return Response(
                {"error": "You do not have superuser privileges"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return _login_success(request, user, "Superuser login successful")


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass

        AuthService.log_action(request.user, CustomerLog.Action.LOGOUT, request)
        logout(request)
        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            AuthService.user_payload(request.user),
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = request.data.get("current_password") or ""
        new_password = request.data.get("new_password") or ""

        if not current or not new_password:
            return Response(
                {"error": "current_password and new_password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(current):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {"error": e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        AuthService.log_action(
            user,
            CustomerLog.Action.PASSWORD_CHANGE,
            request,
            "Password changed",
        )

        tokens = AuthService.get_tokens(user)
        return Response(
            {
                "message": "Password changed successfully",
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


class AuthTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
