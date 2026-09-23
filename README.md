# Ecomerce

Django REST Framework + React (Vite) ecommerce platform.

## Features

- JWT authentication
- Customer, staff and admin roles
- Product catalog
- Categories and nested categories
- Product search and filtering
- Database indexes
- Shopping cart
- Atomic checkout
- Stock locking
- Orders and order items
- Flutterwave payments
- Idempotent payment webhooks
- Refund transactions
- Admin dashboard API
- Customer activity logging
- Health check endpoint
- PostgreSQL production database
- API throttling
- Production logging
- HSTS security
- Docker
- GitHub Actions CI/CD
- GitHub Container Registry

---

# System Architecture

```mermaid
flowchart TD
    A[React / Vite Frontend] --> B[Django REST Framework API]
    B --> C[JWT Authentication]
    B --> D[Product Catalog]
    B --> E[Shopping Cart]
    B --> F[Order Management]
    B --> G[Payment System]
    B --> H[Admin API]
    B --> I[Health Check]
    C --> J[(PostgreSQL)]
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    G --> K[Flutterwave]
    K --> L[Payment Webhook]
    L --> G
```

# Complete System Flow

```mermaid
flowchart TD
    A[Customer Opens React Application] --> B[React / Vite Frontend]
    B --> C{Authenticated?}
    C -->|No| D[Public API]
    C -->|Yes| E[Send JWT Access Token]
    E --> F{JWT Valid?}
    F -->|No| G[401 Unauthorized]
    F -->|Yes| H[Permission / Role Check]
    D --> I[Django REST Framework]
    H --> I
    I --> J{Requested Operation}
    J -->|Products| K[Product Catalog]
    J -->|Categories| L[Category API]
    J -->|Cart| M[Cart API]
    J -->|Checkout| N[Order API]
    J -->|Payment| O[Payment API]
    J -->|Admin| P[Admin API]
    K --> Q[(PostgreSQL)]
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    N --> R[Atomic Checkout]
    R --> S[Lock Product Stock]
    S --> T[Validate Inventory]
    T --> U[Create Order]
    U --> V[Create Order Items]
    V --> W[Reduce Stock]
    W --> X[Create Transaction]
    X --> Y[Clear Cart]
    Y --> Z[Commit Database Transaction]
    O --> AA[Flutterwave]
    AA --> AB[Customer Completes Payment]
    AB --> AC[Flutterwave Webhook]
    AC --> AD[Verify Webhook]
    AD --> AE[Find Transaction]
    AE --> AF{Already Processed?}
    AF -->|Yes| AG[Return Success]
    AF -->|No| AH[Validate Payment]
    AH --> AI[Update Transaction]
    AI --> AJ[Update Order]
    AJ --> AK[Commit]
    I --> AL[CustomerLog]
    AL --> Q
    Z --> AM[Return Order]
    AK --> AM
    AM --> B
```

# Authentication Flow

```mermaid
flowchart TD
    A[React Login Form] --> B[POST /auth/login/]
    B --> C[Django Authentication]
    C --> D{Credentials Valid?}
    D -->|No| E[401 Unauthorized]
    D -->|Yes| F[Check Required Role]
    F --> G{Role Allowed?}
    G -->|No| H[403 Forbidden]
    G -->|Yes| I[Generate JWT Tokens]
    I --> J[Access Token]
    I --> K[Refresh Token]
    J --> L[React Stores Authentication State]
    K --> L
    L --> M[Authenticated API Request]
    M --> N[Authorization Header]
    N --> O{Access Token Valid?}
    O -->|Yes| P[Process Request]
    O -->|No| Q[Refresh Token]
    Q --> R[POST /auth/token/refresh/]
    R --> S{Refresh Token Valid?}
    S -->|Yes| T[New Access Token]
    S -->|No| U[Login Required]
    T --> M
```

# Registration Flow

```mermaid
flowchart TD
    A[Customer] --> B[Registration Form]
    B --> C[POST /auth/register/]
    C --> D[Validate Request]
    D --> E{Validation Passed?}
    E -->|No| F[400 Bad Request]
    E -->|Yes| G[Check Email]
    G --> H{Email Exists?}
    H -->|Yes| I[Registration Error]
    H -->|No| J[Check Username]
    J --> K{Username Exists?}
    K -->|Yes| L[Registration Error]
    K -->|No| M[Create User]
    M --> N[Hash Password]
    N --> O[Assign Customer Role]
    O --> P[Save User]
    P --> Q[Return Registration Response]
```

# Logout Flow

```mermaid
flowchart TD
    A[React Client] --> B[POST /auth/logout/]
    B --> C[Receive Refresh Token]
    C --> D{Refresh Token Valid?}
    D -->|No| E[Reject Request]
    D -->|Yes| F[Invalidate Token]
    F --> G[Return Logout Success]
```

# Product Catalog Flow

```mermaid
flowchart TD
    A[React Product Page] --> B[GET /api/products/]
    B --> C[Django REST Framework]
    C --> D[Product QuerySet]
    D --> E{Filters Provided?}
    E -->|No| F[All Available Products]
    E -->|Yes| G[Apply Filters]
    G --> H[Search]
    G --> I[Category Filter]
    G --> J[Featured Filter]
    G --> K[Price Filter]
    G --> L[Status Filter]
    F --> M[(PostgreSQL)]
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    M --> N[Product Serializer]
    N --> O[JSON Response]
    O --> P[React UI]
```

# Category Flow

```mermaid
flowchart TD
    A[React Client] --> B[GET /api/categories/]
    B --> C[Django REST Framework]
    C --> D[Category Query]
    D --> E[(PostgreSQL)]
    E --> F[Category Serializer]
    F --> G[JSON Response]
    G --> H[React Category UI]
```

# Product Detail Flow

```mermaid
flowchart TD
    A[Customer Selects Product] --> B[GET /api/products/{slug}/]
    B --> C[Validate Slug]
    C --> D{Product Exists?}
    D -->|No| E[404 Not Found]
    D -->|Yes| F[Load Product]
    F --> G[Load Category]
    F --> H[Load Product Images]
    F --> I[Load Inventory Information]
    G --> J[Serializer]
    H --> J
    I --> J
    J --> K[JSON Response]
    K --> L[React Product Page]
```

# Cart Flow

```mermaid
flowchart TD
    A[Customer] --> B[Cart UI]
    B --> C{Cart Operation}
    C -->|View| D[GET /api/cart/]
    C -->|Add| E[POST /api/cart/add/]
    C -->|Update| F[PATCH /api/cart/items/{id}/]
    C -->|Delete| G[DELETE /api/cart/items/{id}/]
    C -->|Clear| H[DELETE /api/cart/clear/]
    D --> I[Load User Cart]
    E --> J[Validate Product]
    F --> K[Validate Quantity]
    G --> L[Remove CartItem]
    H --> M[Remove CartItems]
    J --> N[Check Stock]
    N --> O[Create / Update CartItem]
    I --> P[(PostgreSQL)]
    O --> P
    K --> P
    L --> P
    M --> P
    P --> Q[Cart Response]
    Q --> R[React UI]
```

# Add Product To Cart

```mermaid
flowchart TD
    A[Customer] --> B[POST /api/cart/add/]
    B --> C[Receive product_id and quantity]
    C --> D[Find Product]
    D --> E{Product Exists?}
    E -->|No| F[404 Product Not Found]
    E -->|Yes| G[Check Product Status]
    G --> H{Available?}
    H -->|No| I[Product Unavailable]
    H -->|Yes| J[Check Inventory]
    J --> K{Enough Stock?}
    K -->|No| L[Stock Error]
    K -->|Yes| M[Get User Cart]
    M --> N[Get CartItem]
    N --> O{Existing Item?}
    O -->|Yes| P[Increase Quantity]
    O -->|No| Q[Create CartItem]
    P --> R[(PostgreSQL)]
    Q --> R
    R --> S[Return Updated Cart]
```

# Checkout Flow

```mermaid
flowchart TD
    A[Customer] --> B[POST /api/orders/]
    B --> C[Begin Database Transaction]
    C --> D[Load Customer Cart]
    D --> E{Cart Empty?}
    E -->|Yes| F[Return Cart Error]
    E -->|No| G[Load Cart Items]
    G --> H[Lock Product Rows]
    H --> I[Validate Product Status]
    I --> J[Validate Stock]
    J --> K{Stock Available?}
    K -->|No| L[Rollback Transaction]
    K -->|Yes| M[Calculate Subtotal]
    M --> N[Calculate Shipping]
    N --> O[Calculate Tax]
    O --> P[Calculate Discount]
    P --> Q[Calculate Total]
    Q --> R[Create Order]
    R --> S[Create Order Items]
    S --> T[Reduce Product Stock]
    T --> U[Create Payment Transaction]
    U --> V[Clear Cart]
    V --> W[Commit Transaction]
    W --> X[Return Order]
```

# Checkout Database Transaction

```mermaid
sequenceDiagram
    participant C as Customer
    participant API as Django API
    participant DB as PostgreSQL

    C->>API: POST /api/orders/
    API->>DB: BEGIN TRANSACTION
    API->>DB: Load Cart
    API->>DB: Lock Product Rows
    API->>DB: Validate Stock
    API->>DB: Create Order
    API->>DB: Create Order Items
    API->>DB: Reduce Stock
    API->>DB: Create Transaction
    API->>DB: Clear Cart
    API->>DB: COMMIT
    API-->>C: Order Response
```

# Stock Locking Flow

```mermaid
flowchart TD
    A[Checkout Request] --> B[Begin Atomic Transaction]
    B --> C[Select Products]
    C --> D[Lock Product Rows]
    D --> E[Read Current Stock]
    E --> F{Quantity Available?}
    F -->|No| G[Rollback]
    G --> H[Return Insufficient Stock]
    F -->|Yes| I[Reduce Stock]
    I --> J[Create Order]
    J --> K[Commit]
    K --> L[Checkout Successful]
```

# Order Flow

```mermaid
flowchart TD
    A[Customer] --> B[Create Order]
    B --> C[Validate Cart]
    C --> D[Calculate Order Total]
    D --> E[Create Order]
    E --> F[Create Order Items]
    F --> G[Create Payment Transaction]
    G --> H[Order Created]
    H --> I{Payment}
    I -->|Pending| J[Order Pending]
    I -->|Success| K[Order Paid]
    I -->|Failed| L[Payment Failed]
    K --> M[Customer Order History]
    J --> M
    L --> M
```

# Payment Initialization Flow

```mermaid
flowchart TD
    A[Customer] --> B[POST /api/orders/{id}/pay/]
    B --> C[Find Order]
    C --> D{Order Exists?}
    D -->|No| E[404 Not Found]
    D -->|Yes| F[Validate Order Ownership]
    F --> G{Authorized?}
    G -->|No| H[403 Forbidden]
    G -->|Yes| I[Create / Find Transaction]
    I --> J[Send Payment Request]
    J --> K[Flutterwave]
    K --> L[Payment URL / Reference]
    L --> M[Return Payment Information]
    M --> N[React Redirects Customer]
```

# Flutterwave Payment Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant R as React
    participant API as Django API
    participant DB as PostgreSQL
    participant F as Flutterwave

    C->>R: Click Pay
    R->>API: POST /api/orders/{id}/pay/
    API->>DB: Create Transaction
    API->>F: Initialize Payment
    F-->>API: Payment Reference
    API-->>R: Payment URL
    R-->>C: Redirect to Flutterwave
    C->>F: Complete Payment
    F-->>C: Payment Result
```

# Payment Webhook Flow

```mermaid
flowchart TD
    A[Flutterwave] --> B[POST /api/payments/webhook/]
    B --> C[Receive Webhook]
    C --> D[Verify Webhook Signature]
    D --> E{Signature Valid?}
    E -->|No| F[Reject Webhook]
    E -->|Yes| G[Extract Payment Reference]
    G --> H[Find Transaction]
    H --> I{Transaction Exists?}
    I -->|No| J[Reject / Log Event]
    I -->|Yes| K{Already Processed?}
    K -->|Yes| L[Return Success]
    K -->|No| M[Validate Amount]
    M --> N[Validate Currency]
    N --> O[Validate Provider Status]
    O --> P{Payment Successful?}
    P -->|No| Q[Mark Transaction Failed]
    P -->|Yes| R[Mark Transaction Succeeded]
    R --> S[Mark Order Paid]
    Q --> T[Commit]
    S --> T
    T --> U[Return 200 OK]
```

# Payment Idempotency

```mermaid
flowchart TD
    A[Webhook Received] --> B[Verify Signature]
    B --> C{Valid?}
    C -->|No| D[Reject]
    C -->|Yes| E[Find Transaction]
    E --> F{Transaction Already Completed?}
    F -->|Yes| G[Do Not Process Again]
    G --> H[Return 200 OK]
    F -->|No| I[Validate Provider Reference]
    I --> J[Validate Amount]
    J --> K[Validate Currency]
    K --> L[Update Transaction]
    L --> M[Update Order]
    M --> N[Commit Transaction]
    N --> H
```

# Refund Flow

```mermaid
flowchart TD
    A[Admin] --> B[Refund Request]
    B --> C[Find Original Transaction]
    C --> D{Transaction Exists?}
    D -->|No| E[404 Not Found]
    D -->|Yes| F[Validate Refund Eligibility]
    F --> G{Eligible?}
    G -->|No| H[Reject Refund]
    G -->|Yes| I[Create Refund Transaction]
    I --> J[Set Parent Transaction]
    J --> K[Process Provider Refund]
    K --> L{Refund Successful?}
    L -->|Yes| M[Refund Transaction Completed]
    L -->|No| N[Refund Failed]
    M --> O[Update Order / Payment State]
```

# Admin Flow

```mermaid
flowchart TD
    A[Admin User] --> B[Admin Endpoint]
    B --> C[JWT Authentication]
    C --> D{Token Valid?}
    D -->|No| E[401 Unauthorized]
    D -->|Yes| F[Admin Permission]
    F --> G{Admin?}
    G -->|No| H[403 Forbidden]
    G -->|Yes| I[Admin API]
    I --> J{Operation}
    J -->|Dashboard| K[Dashboard Statistics]
    J -->|Users| L[User Management]
    J -->|Orders| M[Order Management]
    J -->|Products| N[Product Management]
    J -->|Transactions| O[Transaction Management]
    K --> P[(PostgreSQL)]
    L --> P
    M --> P
    N --> P
    O --> P
```

# Customer Activity Logging

```mermaid
flowchart TD
    A[User Request] --> B[Django API]
    B --> C[Process Request]
    C --> D{Loggable Action?}
    D -->|No| E[Return Response]
    D -->|Yes| F[Create CustomerLog]
    F --> G[Capture User]
    G --> H[Capture Action]
    H --> I[Capture Description]
    I --> J[Capture IP Address]
    J --> K[Capture User Agent]
    K --> L[Capture Metadata]
    L --> M[(PostgreSQL)]
    M --> E
```

# Health Check Flow

```mermaid
flowchart TD
    A[Monitoring System] --> B[GET /health/]
    B --> C[Check Django Application]
    C --> D[Check Database Connection]
    D --> E{Healthy?}
    E -->|Yes| F[HTTP 200]
    E -->|No| G[HTTP 503]
    F --> H[Healthy Response]
    G --> I[Unhealthy Response]
```

# Database Architecture

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

# Catalog Database Schema

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

# Commerce Database Schema

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

# Activity Log Schema

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
```

# CI/CD Pipeline

```mermaid
flowchart TD
    A[Developer] --> B[git push]
    B --> C[GitHub Repository]
    C --> D[GitHub Actions]
    D --> E[Backend Lint]
    E --> F[Run Migrations]
    F --> G[Run Pytest]
    G --> H[Frontend Build]
    H --> I{CI Passed?}
    I -->|No| J[Pipeline Failed]
    I -->|Yes| K[Build Docker Image]
    K --> L[Push Image to GHCR]
    L --> M[CD Deployment]
    M --> N{Environment}
    N -->|Staging| O[Staging Deployment]
    N -->|Production| P[Production Deployment]
    O --> Q[Optional Deploy Webhook]
    P --> Q
```

# CI Pipeline

```mermaid
flowchart LR
    A[Push / Pull Request] --> B[Checkout Repository]
    B --> C[Setup Python]
    C --> D[Install Backend Dependencies]
    D --> E[Lint Backend]
    E --> F[Run Django Checks]
    F --> G[Run Migrations]
    G --> H[Run Tests]
    H --> I[Setup Node]
    I --> J[Install Frontend Dependencies]
    J --> K[Build React Application]
    K --> L[Build Docker Image]
    L --> M[CI Complete]
```

# CD Pipeline

```mermaid
flowchart TD
    A[Successful CI] --> B{Branch}
    B -->|main| C[Build Production Image]
    B -->|other| D[No Production Deployment]
    C --> E[Tag Docker Image]
    E --> F[Push to GHCR]
    F --> G{Deployment Environment}
    G --> H[Staging]
    G --> I[Production]
    H --> J[Deploy Webhook]
    I --> J
    J --> K[Deployment Complete]
```

# Docker Architecture

```mermaid
flowchart TD
    A[Docker Compose] --> B[Django API]
    A --> C[PostgreSQL]
    A --> D[React Frontend]
    B --> C
    D --> B
    B --> E[Flutterwave]
```

# Production Architecture

```mermaid
flowchart LR
    A[Customer Browser] --> B[HTTPS]
    B --> C[React Frontend]
    C --> D[Django REST API]
    D --> E[(PostgreSQL)]
    D --> F[Flutterwave]
    F --> G[Payment Webhook]
    G --> D
    H[GitHub Actions] --> I[GHCR]
    I --> J[Production Server]
    J --> D
```

# API Endpoints

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health/` | Liveness and database health |

## Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register/` | Register user |
| POST | `/auth/login/` | Login |
| POST | `/auth/logout/` | Logout |
| GET | `/auth/me/` | Current user |
| POST | `/auth/token/refresh/` | Refresh JWT |

## Products

| Method | Path | Description |
|---|---|---|
| GET | `/api/products/` | Product list |
| GET | `/api/products/{slug}/` | Product detail |
| GET | `/api/categories/` | Categories |

## Cart

| Method | Path | Description |
|---|---|---|
| GET | `/api/cart/` | Current cart |
| POST | `/api/cart/add/` | Add product |
| PATCH | `/api/cart/items/{id}/` | Update quantity |
| DELETE | `/api/cart/items/{id}/` | Delete item |
| DELETE | `/api/cart/clear/` | Clear cart |

## Orders

| Method | Path | Description |
|---|---|---|
| GET | `/api/orders/` | Customer orders |
| POST | `/api/orders/` | Create order |
| POST | `/api/orders/{id}/pay/` | Initialize payment |

## Payments

| Method | Path | Description |
|---|---|---|
| POST | `/api/payments/webhook/` | Flutterwave webhook |

## Admin

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/dashboard/` | Dashboard statistics |
| GET | `/api/admin/users/` | Users |
| GET/PATCH | `/api/admin/orders/` | Orders |

Django Admin:

```text
/admin/
```

# Product Filters

```text
/api/products/?category=electronics
/api/products/?featured=true
/api/products/?min_price=10000
/api/products/?max_price=500000
/api/products/?search=phone
```

# Database Indexes

## Product

```text
(status, name)
(status, is_featured)
(category, status)
(status, price)
(status, stock_quantity)
```

## Order

```text
(user, -created_at)
(user, status)
(status, -created_at)
```

## Transaction

```text
(order, status)
(provider, provider_payment_id)
(user, status, -created_at)
```

## CustomerLog

```text
(user, action)
(action, -created_at)
```

# Entity Summary

| Model | Purpose | Key relations |
|---|---|---|
| User | Authentication identity | Cart, Orders, Transactions, Logs |
| Category | Hierarchical catalog | Parent, Products |
| Product | Sellable SKU and inventory | Category, Images, CartItems, OrderItems |
| ProductImage | Product gallery | Product |
| Cart | Pre-checkout basket | User, CartItems |
| CartItem | Product in cart | Cart, Product |
| Order | Checkout record | User, OrderItems, Transactions |
| OrderItem | Purchase snapshot | Order, Product |
| Transaction | Payments and refunds | Order, User, Parent Transaction |
| CustomerLog | Audit trail | User |

# Local Setup

## Backend

```bash
cd backend
python -m venv venv
```

Linux / macOS:

```bash
source venv/bin/activate
```

Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create environment file:

```bash
cp .env.example .env
```

Run migrations:

```bash
cd src
python manage.py makemigrations
python manage.py migrate
```

Create administrator:

```bash
python manage.py createsuperuser
```

Start server:

```bash
python manage.py runserver
```

API:

```text
http://127.0.0.1:8000
```

# Frontend Setup

```bash
cd frontend
npm install
```

Optional API configuration:

```bash
echo VITE_API_URL=http://127.0.0.1:8000 > .env
```

Start Vite:

```bash
npm run dev
```

# Docker

```bash
docker compose up --build
```

API:

```text
http://localhost:8000
```

Health:

```text
http://localhost:8000/health/
```

Stop:

```bash
docker compose down
```

# Production Database

```env
DATABASE_URL=postgres://user:password@host:5432/ecomerce
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<long-random-string>
DJANGO_ALLOWED_HOSTS=yourdomain.com
```

# Environment Variables

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<secret>
DJANGO_ALLOWED_HOSTS=yourdomain.com

DATABASE_URL=postgres://user:password@host:5432/ecomerce

FLUTTERWAVE_PUBLIC_KEY=<public-key>
FLUTTERWAVE_SECRET_KEY=<secret-key>
```

Never commit production secrets to GitHub.

# Tests

```bash
cd backend/src
pip install pytest pytest-django
pytest app/tests/ -v
```

Coverage:

```bash
pip install pytest-cov
pytest app/tests/ -v --cov=app --cov-report=term-missing
```

# Security

The production application should use:

- `DJANGO_DEBUG=False`
- HTTPS
- HSTS
- Secure cookies
- CSRF protection
- JWT authentication
- Role-based permissions
- API throttling
- PostgreSQL
- Environment-based secrets
- Server-side payment verification
- Webhook signature verification
- Idempotent payment processing
- Database transactions
- Stock locking

# Source of Truth

The database model source of truth is:

```text
backend/src/app/models.py
```

The main Django application is located under:

```text
backend/src/app/
```

# CI/CD Configuration

## GitHub Container Registry

```text
ghcr.io/<org>/ecomerce/backend
```

## GitHub Environments

```text
staging
production
```

Optional secrets:

```text
DEPLOY_WEBHOOK_URL
DEPLOY_WEBHOOK_TOKEN
```

Optional variables:

```text
STAGING_URL
PRODUCTION_URL
```

Manual deployment:

```text
GitHub
→ Actions
→ CD – Deploy
→ Run workflow
→ Select staging or production
```

# Complete Data Flow

```mermaid
flowchart TD
    A[Customer] --> B[React / Vite]
    B --> C[Django REST API]
    C --> D{Authentication}
    D -->|Public| E[Catalog]
    D -->|Authenticated| F[JWT Validation]
    F --> G[Permission Check]
    G --> H[Cart]
    G --> I[Orders]
    G --> J[Payments]
    G --> K[Admin]
    E --> L[(PostgreSQL)]
    H --> L
    I --> L
    J --> L
    K --> L
    H --> M[Checkout]
    M --> N[Atomic Transaction]
    N --> O[Lock Stock]
    O --> P[Validate Inventory]
    P --> Q[Create Order]
    Q --> R[Create Order Items]
    R --> S[Reduce Stock]
    S --> T[Create Transaction]
    T --> U[Clear Cart]
    U --> V[Commit]
    J --> W[Flutterwave]
    W --> X[Webhook]
    X --> Y[Verify Webhook]
    Y --> Z[Validate Transaction]
    Z --> AA{Payment Status}
    AA -->|Success| AB[Transaction Succeeded]
    AA -->|Failed| AC[Transaction Failed]
    AB --> AD[Order Paid]
    AD --> AE[Customer Order Status]
    AC --> AE
    C --> AF[CustomerLog]
    AF --> L
```

# Development Lifecycle

```mermaid
flowchart LR
    A[Developer] --> B[Code]
    B --> C[Git]
    C --> D[GitHub]
    D --> E[CI]
    E --> F{Tests Pass?}
    F -->|No| G[Fix Code]
    G --> B
    F -->|Yes| H[Docker Build]
    H --> I[GHCR]
    I --> J[Deployment]
    J --> K[Production]
```

# Project Workflow

```mermaid
flowchart TD
    A[User Registration] --> B[JWT Login]
    B --> C[Browse Products]
    C --> D[Search / Filter]
    D --> E[Product Details]
    E --> F[Add To Cart]
    F --> G[Update Cart]
    G --> H[Checkout]
    H --> I[Lock Stock]
    I --> J[Create Order]
    J --> K[Create Transaction]
    K --> L[Flutterwave Payment]
    L --> M[Payment Webhook]
    M --> N[Verify Payment]
    N --> O{Successful?}
    O -->|Yes| P[Mark Transaction Succeeded]
    P --> Q[Mark Order Paid]
    O -->|No| R[Mark Transaction Failed]
    Q --> S[Customer Views Order]
    R --> S
```

# License

Add the project's license here.

# Status

The project provides a full-stack ecommerce architecture:

```text
React
  ↓
Django REST Framework
  ↓
JWT Authentication
  ↓
Product Catalog
  ↓
Shopping Cart
  ↓
Atomic Checkout
  ↓
Orders
  ↓
Transactions
  ↓
Flutterwave
  ↓
Webhook Verification
  ↓
PostgreSQL
```
