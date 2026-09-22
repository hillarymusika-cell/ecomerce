# ecomerce

Django REST Framework ecommerce backend.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd src
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## API endpoints

### Auth
- `POST /auth/register/`
- `POST /auth/login/` (customer)
- `POST /auth/staff/login/`
- `POST /auth/admin/login/`
- `POST /auth/superuser/login/`
- `POST /auth/logout/`
- `GET  /auth/me/`

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
