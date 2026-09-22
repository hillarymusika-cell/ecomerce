from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, CustomerLog


class AuthService:
    @staticmethod
    def get_tokens(user):
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    @staticmethod
    def log_action(user, action, request):
        CustomerLog.objects.create(
            user=user,
            action=action,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
        )


class BaseAuthView(APIView):
    permission_classes = [AllowAny]

    def get_user_data(self, user):
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "is_staff": user.is_staff,
            "is_admin": user.is_admin,
            "is_superuser": user.is_superuser,
        }


class RegisterView(BaseAuthView):
    def post(self, request):
        data = request.data
        email = data.get("email", "").strip().lower()
        username = data.get("username", "").strip()
        password = data.get("password", "")
        telephone_no = data.get("telephone_no", "").strip()

        if not all([email, username, password, telephone_no]):
            return Response(
                {"error": "email, username, password and telephone_no are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(telephone_no=telephone_no).exists():
            return Response({"error": "Telephone number already registered"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except ValidationError as e:
            return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    telephone_no=telephone_no,
                    country=data.get("country", ""),
                    city=data.get("city", ""),
                )
                AuthService.log_action(user, CustomerLog.Action.REGISTER, request)

            tokens = AuthService.get_tokens(user)
            return Response(
                {
                    "message": "Registration successful",
                    "user": self.get_user_data(user),
                    "tokens": tokens,
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CustomerLoginView(BaseAuthView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"error": "email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is disabled"}, status=status.HTTP_403_FORBIDDEN)

        if user.is_staff or user.is_admin or user.is_superuser:
            return Response(
                {"error": "Please use the staff/admin login endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        login(request, user)
        AuthService.log_action(user, CustomerLog.Action.LOGIN, request)

        tokens = AuthService.get_tokens(user)
        return Response(
            {
                "message": "Login successful",
                "user": self.get_user_data(user),
                "tokens": tokens,
            },
            status=status.HTTP_200_OK
        )


class StaffLoginView(BaseAuthView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"error": "email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is disabled"}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_staff:
            return Response(
                {"error": "You do not have staff privileges"},
                status=status.HTTP_403_FORBIDDEN
            )

        login(request, user)
        AuthService.log_action(user, CustomerLog.Action.LOGIN, request)

        tokens = AuthService.get_tokens(user)
        return Response(
            {
                "message": "Staff login successful",
                "user": self.get_user_data(user),
                "tokens": tokens,
            },
            status=status.HTTP_200_OK
        )


class AdminLoginView(BaseAuthView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"error": "email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is disabled"}, status=status.HTTP_403_FORBIDDEN)

        if not (user.is_admin or user.is_superuser):
            return Response(
                {"error": "You do not have admin privileges"},
                status=status.HTTP_403_FORBIDDEN
            )

        login(request, user)
        AuthService.log_action(user, CustomerLog.Action.LOGIN, request)

        tokens = AuthService.get_tokens(user)
        return Response(
            {
                "message": "Admin login successful",
                "user": self.get_user_data(user),
                "tokens": tokens,
            },
            status=status.HTTP_200_OK
        )


class SuperuserLoginView(BaseAuthView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"error": "email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is disabled"}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_superuser:
            return Response(
                {"error": "You do not have superuser privileges"},
                status=status.HTTP_403_FORBIDDEN
            )

        login(request, user)
        AuthService.log_action(user, CustomerLog.Action.LOGIN, request)

        tokens = AuthService.get_tokens(user)
        return Response(
            {
                "message": "Superuser login successful",
                "user": self.get_user_data(user),
                "tokens": tokens,
            },
            status=status.HTTP_200_OK
        )


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
        user = request.user
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "telephone_no": user.telephone_no,
                "country": user.country,
                "city": user.city,
                "role": user.role,
                "is_staff": user.is_staff,
                "is_admin": user.is_admin,
                "is_superuser": user.is_superuser,
                "profile_image": user.profile_image.url if user.profile_image else None,
            },
            status=status.HTTP_200_OK
        )