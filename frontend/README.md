# Ecomerce React Frontend

React + Vite frontend for the Django REST API in this repository.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` to the URL where the Django backend is running.

## Backend endpoints used

- `/auth/register/`
- `/auth/login/`
- `/auth/logout/`
- `/auth/me/`
- `/api/products/`
- `/api/cart/`
- `/api/cart/add/`
- `/api/cart/items/<id>/`
- `/api/cart/clear/`
- `/api/orders/`

The frontend uses JWT access and refresh tokens from the authentication API.
