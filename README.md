# ecomerce

Django REST Framework + React (Vite) ecommerce platform.

## Features

- JWT auth (customer / staff / admin roles)
- Product catalog with categories, search, filters, indexes
- Cart + atomic checkout with stock locking
- Orders & Flutterwave payment webhook (idempotent)
- Admin dashboard API
- Health check endpoint
- Production-ready settings (Postgres via `DATABASE_URL`, throttling, logging, HSTS)

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # set DJANGO_SECRET_KEY for production
cd src
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Production database

Set in `.env`:

```env
DATABASE_URL=postgres://user:password@host:5432/ecomerce
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<long-random-string>
DJANGO_ALLOWED_HOSTS=yourdomain.com
```

## Frontend setup

```bash
cd frontend
npm install
# optional: echo VITE_API_URL=http://127.0.0.1:8000 > .env
npm run dev
```

## API overview

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health/` | Liveness + DB check |
| POST | `/auth/register/` | email, username, password, telephone_no |
| POST | `/auth/login/` | unified login (`required_role` optional) |
| POST | `/auth/logout/` | body: `{ "refresh": "..." }` |
| GET | `/auth/me/` | current user |
| POST | `/auth/token/refresh/` | `{ "refresh": "..." }` |
| GET | `/api/products/` | search, `?category=`, `?featured=`, `?min_price=` |
| GET | `/api/products/{slug}/` | |
| GET | `/api/categories/` | |
| GET | `/api/cart/` | |
| POST | `/api/cart/add/` | `{ "product_id": 1, "quantity": 2 }` |
| PATCH | `/api/cart/items/{id}/` | `{ "quantity": 3 }` |
| DELETE | `/api/cart/items/{id}/` | |
| DELETE | `/api/cart/clear/` | |
| GET | `/api/orders/` | |
| POST | `/api/orders/` | checkout (optional shipping_address) |
| POST | `/api/orders/{id}/pay/` | start payment |
| POST | `/api/payments/webhook/` | Flutterwave webhook |
| GET | `/api/admin/dashboard/` | admin stats |
| GET | `/api/admin/users/` | |
| GET/PATCH | `/api/admin/orders/` | |

Admin UI: `/admin/`
