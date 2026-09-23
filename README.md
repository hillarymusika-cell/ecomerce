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

## Database schema

High-level entity relationships (Mermaid ER diagrams render on GitHub).

### Overview

```mermaid
erDiagram
    User ||--o| Cart : has
    User ||--o{ Order : places
    User ||--o{ Transaction : pays
    User ||--o{ CustomerLog : generates

    Category ||--o{ Category : parent
    Category ||--o{ Product : categorizes

    Product ||--o{ ProductImage : has
    Product ||--o{ CartItem : in
    Product ||--o{ OrderItem : ordered_as

    Cart ||--o{ CartItem : contains

    Order ||--o{ OrderItem : contains
    Order ||--o{ Transaction : settled_by

    Transaction ||--o| Transaction : refunds
```

### Catalog domain

```mermaid
erDiagram
    Category {
        bigint id PK
        string name UK
        string slug UK
        bigint parent_id FK
        bool is_active
        datetime created_at
    }

    Product {
        bigint id PK
        string name
        string slug UK
        string sku UK
        text description
        decimal price
        decimal compare_at_price
        decimal cost_price
        string currency
        bool track_inventory
        int stock_quantity
        int low_stock_threshold
        bigint category_id FK
        string status
        bool is_featured
        bool is_digital
        json attributes
        datetime created_at
        datetime updated_at
    }

    ProductImage {
        bigint id PK
        bigint product_id FK
        string image
        string alt_text
        bool is_primary
        int sort_order
    }

    Category ||--o{ Category : parent
    Category ||--o{ Product : category
    Product ||--o{ ProductImage : images
```

### Commerce domain (cart → order → payment)

```mermaid
erDiagram
    User {
        bigint id PK
        string email UK
        string username UK
        string telephone_no UK
        string role
        bool is_admin
        bool is_staff
        datetime created_at
    }

    Cart {
        bigint id PK
        bigint user_id FK UK
        datetime created_at
        datetime updated_at
    }

    CartItem {
        bigint id PK
        bigint cart_id FK
        bigint product_id FK
        int quantity
    }

    Order {
        bigint id PK
        string order_number UK
        bigint user_id FK
        string status
        decimal subtotal
        decimal shipping_cost
        decimal tax_amount
        decimal discount
        decimal total
        string currency
        json shipping_address
        json billing_address
        datetime created_at
        datetime paid_at
    }

    OrderItem {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        string product_name
        string sku
        int quantity
        decimal unit_price
        decimal total_price
    }

    Transaction {
        bigint id PK
        string transaction_id UK
        bigint order_id FK
        bigint user_id FK
        string type
        string status
        string provider
        decimal amount
        string currency
        string provider_payment_id
        bigint parent_transaction_id FK
        datetime created_at
        datetime completed_at
    }

    User ||--o| Cart : cart
    Cart ||--o{ CartItem : items
    Product ||--o{ CartItem : product
    User ||--o{ Order : orders
    Order ||--o{ OrderItem : items
    Product ||--o{ OrderItem : product
    User ||--o{ Transaction : transactions
    Order ||--o{ Transaction : transactions
    Transaction ||--o| Transaction : parent
```

### Activity log

```mermaid
erDiagram
    User ||--o{ CustomerLog : logs

    CustomerLog {
        bigint id PK
        bigint user_id FK
        string action
        text description
        string ip_address
        string user_agent
        json metadata
        datetime created_at
    }
```###SYSTEM FLOW CHART
```mermaid
flowchart TD
    A[React / Vite Frontend] --> B[REST API]

    B --> C{Authentication Required?}

    C -->|No| D[Public API]
    C -->|Yes| E[JWT Authentication]

    E --> F{Token Valid?}
    F -->|No| G[401 Unauthorized]
    F -->|Yes| H[Permission / Role Check]

    D --> I[Django REST Framework]
    H --> I

    I --> J{Operation}

    J -->|Products| K[Product / Category]
    J -->|Cart| L[Cart / CartItem]
    J -->|Checkout| M[Atomic Checkout]
    J -->|Orders| N[Order / OrderItem]
    J -->|Payment| O[Transaction]
    J -->|Admin| P[Admin API]

    K --> Q[(PostgreSQL)]
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q

    M --> R[Stock Lock]
    R --> S[Create Order]
    S --> T[Create Order Items]
    T --> U[Reduce Stock]
    U --> V[Clear Cart]

    V --> W[Flutterwave]
    W --> X[Payment Webhook]
    X --> O

    O --> Y{Payment Result}
    Y -->|Success| Z[Transaction SUCCEEDED]
    Z --> AA[Order PAID]

    Y -->|Failed| AB[Transaction FAILED]

    I --> AC[CustomerLog]
    AC --> Q

    AA --> AD[Return Order Status]
    AB --> AD
    AD --> A
```

### Entity summary

| Model | Purpose | Key relations |
|-------|---------|----------------|
| **User** | Auth identity (`email` as username) | 1→1 Cart, 1→N Orders, Transactions, Logs |
| **Category** | Hierarchical catalog | Self FK `parent`, 1→N Products |
| **Product** | Sellable SKU + inventory | FK Category, 1→N Images / CartItems / OrderItems |
| **ProductImage** | Gallery; at most one primary per product | FK Product |
| **Cart** / **CartItem** | Pre-checkout basket | User 1→1 Cart; unique `(cart, product)` |
| **Order** / **OrderItem** | Snapshot at checkout | User FK (PROTECT); line items store name/sku/price |
| **Transaction** | Payments & refunds | Order FK; optional self-FK for refunds |
| **CustomerLog** | Audit trail (login, cart, payments, …) | Optional User FK |

### Notable indexes (performance)

- **Product**: `(status, name)`, `(status, is_featured)`, `(category, status)`, `(status, price)`, `(status, stock_quantity)`
- **Order**: `(user, -created_at)`, `(user, status)`, `(status, -created_at)`
- **Transaction**: `(order, status)`, `(provider, provider_payment_id)`, `(user, status, -created_at)`
- **CustomerLog**: `(user, action)`, `(action, -created_at)`

Source of truth: `backend/src/app/models.py`.

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
