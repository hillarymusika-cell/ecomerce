# ecomerce

Django REST Framework + React (Vite) ecommerce.

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # edit DJANGO_SECRET_KEY for production
cd src
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Frontend setup

```bash
cd frontend
npm install
# optional: echo VITE_API_URL=http://127.0.0.1:8000 > .env
npm run dev
```

## Auth API

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/register/` | email, username, password, telephone_no |
| POST | `/auth/login/` | **unified** login (optional `required_role`) |
| POST | `/auth/customer/login/` | customer-only |
| POST | `/auth/staff/login/` | staff |
| POST | `/auth/admin/login/` | admin |
| POST | `/auth/superuser/login/` | superuser |
| POST | `/auth/logout/` | body: `{ "refresh": "..." }` |
| GET  | `/auth/me/` | current user |
| POST | `/auth/change-password/` | current_password, new_password |
| POST | `/auth/token/refresh/` | `{ "refresh": "..." }` |

### Products & Cart

- `GET    /api/products/`
- `GET    /api/products/{slug}/`
- `GET    /api/cart/`
- `POST   /api/cart/add/`          body: `{ "product_id": 1, "quantity": 2 }`
- `PATCH  /api/cart/items/{id}/`   body: `{ "quantity": 3 }`
- `DELETE /api/cart/items/{id}/`
- `DELETE /api/cart/clear/`

### Orders

- `GET  /api/orders/`
- `GET  /api/orders/{id}/`
- `POST /api/orders/`   (checkout from cart)

Admin: `/admin/`
