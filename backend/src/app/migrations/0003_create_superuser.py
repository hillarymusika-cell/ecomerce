# Data migration: ensure bootstrap superuser exists.
# Password: env BOOTSTRAP_SUPERUSER_PASSWORD, else ChangeMeNow!123
# Change the password after first login.

import os

from django.db import migrations


EMAIL = "hillarymusika@gmail.com"
USERNAME = "hillary"
TELEPHONE = "+10000000001"
DEFAULT_PASSWORD = "ChangeMeNow!123"


def create_superuser(apps, schema_editor):
    User = apps.get_model("app", "User")
    password = os.environ.get("BOOTSTRAP_SUPERUSER_PASSWORD") or DEFAULT_PASSWORD

    user = User.objects.filter(email__iexact=EMAIL).first()
    if user is None:
        # Avoid unique clashes on username / telephone if already taken
        username = USERNAME
        if User.objects.filter(username=username).exists():
            username = "hillary_admin"
        telephone = TELEPHONE
        if User.objects.filter(telephone_no=telephone).exists():
            telephone = "+10000000099"

        user = User(
            email=EMAIL.lower(),
            username=username,
            telephone_no=telephone,
            is_staff=True,
            is_superuser=True,
            is_admin=True,
            is_active=True,
            role="admin",
        )
        # Historical model has no custom manager; hash via Django's hasher
        from django.contrib.auth.hashers import make_password

        user.password = make_password(password)
        user.save()
        return

    # Existing user: promote to superuser/admin without resetting password
    changed = False
    if not user.is_superuser:
        user.is_superuser = True
        changed = True
    if not user.is_staff:
        user.is_staff = True
        changed = True
    if not getattr(user, "is_admin", False):
        user.is_admin = True
        changed = True
    if not user.is_active:
        user.is_active = True
        changed = True
    if (user.role or "") != "admin":
        user.role = "admin"
        changed = True
    if changed:
        user.save()


def reverse_superuser(apps, schema_editor):
    # Do not delete the user on reverse — only clear elevated flags if desired.
    # Leaving as no-op is safer for production data.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_alter_user_groups"),
    ]

    operations = [
        migrations.RunPython(create_superuser, reverse_superuser),
    ]
