# 4RMTECH Backend (Database + API)

This folder contains a production-style backend for an online shop:

- **PostgreSQL** database (via `docker-compose.yml` at repo root)
- **Prisma** schema + migrations (users, products, carts, orders, payments)
- **Express API** (auth, products, cart, checkout/orders, payments placeholder)

## 1) Start the database

### Option A (recommended): Docker Desktop

1. Install Docker Desktop for Windows.
2. From repo root:

```bash
docker compose up -d
```

### Option B: Existing Postgres install

If you already have Postgres running, update `server/.env`:

- `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"`

## 2) Install dependencies

```bash
cd server
npm install
```

## 3) Create tables (migrations)

```bash
cd server
npx prisma migrate dev --name init
```

## 4) Seed sample data

```bash
cd server
npm run db:seed
```

## 5) Run the API

```bash
cd server
npm run dev
```

API will be at `http://localhost:4000`.

## Endpoints (high level)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/products`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/checkout/place-order`
- `POST /api/orders/:orderId/payment`
- `GET /api/orders`

