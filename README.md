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
- **CI/CD** via GitHub Actions (lint, tests, Docker build, GHCR push, deploy hooks)

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | push / PR to `main` | Backend lint + migrate + pytest; frontend build; Docker build on push |
| **CD – Deploy** | after successful CI on `main`, or manual | Build & push image to `ghcr.io/<org>/ecomerce/backend`, optional webhook deploy |

### Enable deploy

1. **Packages**: image is pushed to GitHub Container Registry (`ghcr.io`).
2. **Environments**: create GitHub environments `staging` and `production` (Settings → Environments).
3. **Optional secrets**:
   - `DEPLOY_WEBHOOK_URL` – POST target for deploy notifications
   - `DEPLOY_WEBHOOK_TOKEN` – Bearer token for the webhook
4. **Optional variables**: `STAGING_URL`, `PRODUCTION_URL` (shown on environment page).

Manual deploy: **Actions → CD – Deploy → Run workflow** → choose `staging` or `production`.

### Local Docker

```bash
docker compose up --build
# API: http://localhost:8000
# Health: http://localhost:8000/health/
```

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

## Tests

```bash
cd backend/src
pip install pytest pytest-django
pytest app/tests/ -v
```
