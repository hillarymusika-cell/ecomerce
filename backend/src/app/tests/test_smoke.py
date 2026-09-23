"""Smoke tests for CI – models, health, catalog basics."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from app.models import Category, Product, User


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="buyer@example.com",
        username="buyer",
        password="SecurePass123!",
        telephone_no="+10000000001",
    )


@pytest.fixture
def product(db):
    cat = Category.objects.create(name="Gadgets", slug="gadgets")
    return Product.objects.create(
        name="Test Phone",
        sku="SKU-TEST-001",
        price="99.99",
        status=Product.Status.ACTIVE,
        category=cat,
        stock_quantity=10,
    )


@pytest.mark.django_db
def test_health_endpoint(api):
    res = api.get("/health/")
    assert res.status_code == 200
    assert res.data["status"] == "ok"
    assert res.data["database"] == "up"


@pytest.mark.django_db
def test_product_list_public(api, product):
    res = api.get("/api/products/")
    assert res.status_code == 200
    # Paginated or list
    results = res.data.get("results", res.data)
    assert any(p["sku"] == "SKU-TEST-001" for p in results)


@pytest.mark.django_db
def test_product_detail_by_slug(api, product):
    res = api.get(f"/api/products/{product.slug}/")
    assert res.status_code == 200
    assert res.data["name"] == "Test Phone"


@pytest.mark.django_db
def test_register_and_login(api):
    payload = {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "SecurePass123!",
        "telephone_no": "+10000000099",
    }
    res = api.post("/auth/register/", payload, format="json")
    assert res.status_code in (200, 201)

    res = api.post(
        "/auth/login/",
        {"email": payload["email"], "password": payload["password"]},"n        format="json",
    )
    assert res.status_code == 200
    assert "tokens" in res.data
    assert "access" in res.data["tokens"]


@pytest.mark.django_db
def test_cart_requires_auth(api):
    res = api.get("/api/cart/")
    assert res.status_code in (401, 403)


@pytest.mark.django_db
def test_add_to_cart_and_checkout(api, user, product):
    api.force_authenticate(user=user)

    res = api.post(
        "/api/cart/add/",
        {"product_id": product.id, "quantity": 2},
        format="json",
    )
    assert res.status_code in (200, 201)

    res = api.get("/api/cart/")
    assert res.status_code == 200
    assert len(res.data["items"]) == 1

    res = api.post("/api/orders/", {}, format="json")
    assert res.status_code == 201
    assert res.data["order_number"].startswith("ORD-")
    assert res.data["status"] == "pending"

    product.refresh_from_db()
    assert product.stock_quantity == 8
