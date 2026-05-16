# Kitchen E-Commerce PWA (MERN)

Production-ready scaffold for a kitchen products e-commerce Progressive Web App.

## Stack

- **Frontend:** Vite + React 18, React Router, Redux Toolkit, Tailwind CSS, `vite-plugin-pwa` (service worker + manifest), `socket.io-client`
- **Backend:** Node.js + Express, Mongoose, JWT (access + refresh), Socket.IO, Zod validation
- **Database:** MongoDB
- **Integrations:** Arkesel (SMS OTP + order notifications), Paystack (payments)
- **Security:** Helmet, CORS, rate limiting, mongo sanitize, bcrypt password hashing, refresh-token rotation

The Arkesel and Paystack integrations are written so that **if the keys are empty, the system falls into stub mode**: OTPs are printed to the server console, and Paystack redirects to a local sandbox page that simulates a successful payment. This lets the full end-to-end flow run without any third-party accounts.

---

## Quick start

### 1. Install dependencies

From the repo root:

```bash
npm install
npm install --workspace server
npm install --workspace client
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set at minimum:

- `MONGO_URI` — your MongoDB connection string (Atlas or local)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — long random strings
- Arkesel + Paystack keys (optional — see "Stub mode" below)

### 3. Start MongoDB

Either run MongoDB locally (`mongod`) or point `MONGO_URI` to a MongoDB Atlas cluster.

### 4. Seed an initial Super Admin

```bash
npm --workspace server run seed
```

This creates:
- Super Admin (default phone `+10000000000`, password `ChangeMe123!`). Override via `SEED_SUPER_ADMIN_PHONE` and `SEED_SUPER_ADMIN_PASSWORD`.
- Roles (`super_admin`, `admin`, `client`)
- Sample categories (Cookware, Cutlery, Bakeware, Appliances, Storage)
- A default public `storefront` setting

### 5. Run the app

```bash
npm run dev
```

This starts the backend on `http://localhost:5000` and the frontend on `http://localhost:5173`.

---

## Stub mode (no Arkesel / no Paystack)

Leave `ARKESEL_API_KEY` and `PAYSTACK_SECRET_KEY` empty in `server/.env` and:

- **OTPs**: printed in the server console as `[sms-stub] -> +123...: Your verification code is 123456...`
- **Payments**: checkout redirects to a local sandbox page (`/checkout/stub-pay`) where one click simulates a successful payment.

To go live, fill in the real keys — no code changes needed.

---

## Project layout

```
/server                 Express API
  src/
    config/             env, db connection
    models/             Mongoose schemas (User, Role, Product, Category, Order, Payment, Review, Notification, Setting, Banner)
    routes/             /api route definitions
    controllers/        Route handlers
    middlewares/        auth, validation, error handler, rate limiters
    services/           Arkesel, Paystack, Socket.IO, notifications
    validators/         Zod request schemas
    utils/              JWT, OTP, ApiError, async wrapper, pagination, seed
    index.js            Entry point

/client                 React PWA
  src/
    main.jsx            React entry
    App.jsx             Router
    layouts/            PublicLayout, AuthLayout, AdminLayout
    pages/              Storefront, admin, super-admin, auth pages
    components/         common (Loader, Empty, ProductCard) + layout (Header, Footer)
    store/              Redux Toolkit slices
    services/           axios api client (with refresh-token interceptor), socket.io client
    routes/             ProtectedRoute guard
    index.css           Tailwind layers + design tokens
  public/               icons, robots.txt, favicon
  vite.config.js        Vite + PWA plugin configuration
  tailwind.config.js    Design tokens (maxshop palette)
```

---

## API surface

All endpoints under `/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/register` | Phone-based registration → sends OTP |
| POST | `/auth/verify-otp` | Verify OTP, returns access + refresh tokens |
| POST | `/auth/resend-otp` | Re-send OTP (rate limited) |
| POST | `/auth/login` | Phone + password login |
| POST | `/auth/refresh` | Rotate refresh token, mint new access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current authenticated user |
| GET | `/products` | List products (filtering, sorting, pagination) |
| GET | `/products/:id` | Get product by id or slug |
| POST/PUT/DELETE | `/products[/:id]` | Admin: CRUD |
| POST | `/products/bulk` | Admin: bulk upload |
| GET | `/categories` | List active categories |
| POST/PUT/DELETE | `/categories[/:id]` | Admin: CRUD |
| POST | `/orders` | Create order + initialize Paystack payment |
| GET | `/orders/mine` | Customer's orders |
| GET | `/orders/:id` | Order detail (owner or admin) |
| GET | `/orders/all` | Admin: all orders |
| PATCH | `/orders/:id/status` | Admin: update status (triggers SMS + socket notification) |
| GET | `/payments/verify/:reference` | Verify a Paystack transaction |
| POST | `/payments/webhook/paystack` | Paystack webhook (signature verified) |
| GET | `/banners` | Public banners (with placement filter) |
| GET/POST/PUT/DELETE | `/banners[/:id]` | Admin: CMS |
| POST | `/reviews` | Authenticated, delivered-order-only |
| GET | `/products/:productId/reviews` | Public product reviews |
| GET | `/notifications` | User notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| GET | `/admin/metrics` | Dashboard KPIs |
| GET | `/admin/customers` | Search customers |
| GET | `/admin/reports/sales` | Sales report by date range |
| GET | `/super-admin/admins` | Super: list admin users |
| POST | `/super-admin/admins` | Super: create admin |
| PATCH | `/super-admin/users/:id/role` | Super: change a user's role |
| PATCH | `/super-admin/users/:id/active` | Super: enable/disable user |
| GET/PUT | `/super-admin/settings` | Super: manage system settings |
| GET | `/super-admin/settings/public` | Public settings (no auth) |

---

## Real-time events (Socket.IO)

Server emits:

- `notification:new` → emitted to `user:<id>` room when a notification is created
- `order:new` → emitted to `admins` room on order creation
- `order:paid` → emitted to `admins` room on successful payment

Client auto-connects with the JWT access token. Admins join the `admins` room on connect.

---

## PWA

The client is configured via `vite-plugin-pwa`:

- Auto-update service worker
- Manifest with maskable icons (drop your `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` into `client/public/`)
- Runtime caching: `CacheFirst` for images, `StaleWhileRevalidate` for public product/category/banner endpoints
- `navigateFallback` enables offline navigation to the app shell

Run `npm run build && npm run preview --workspace client` to verify Lighthouse PWA score on the built bundle.

---

## Security checklist

- Password hashing via bcrypt (configurable salt rounds)
- JWT access tokens (short-lived) + refresh tokens (rotated and hashed at rest)
- Zod request validation on every mutating route
- Helmet, CORS allowlist (single origin), HPP, mongo sanitization
- Global + per-route rate limits (auth, OTP)
- Phone verification required to place orders (`requireVerifiedPhone`)
- Paystack webhook HMAC signature verification (when `PAYSTACK_WEBHOOK_SECRET` is set)
- Refresh-token rotation on every refresh; logout revokes the stored hash

---

## Color palette (extracted from maxshop home2 demo)

Configured in `client/tailwind.config.js`:

- Primary: `#FF6B35` (orange — CTAs, brand)
- Accent: `#0099CC` (links)
- Success: `#28A745` • Danger: `#D32F2F`
- Ink (text): `#333333` • Canvas (background): `#F5F5F5`

---

## Production deployment

1. Build the client: `npm run build` (outputs to `client/dist`).
2. Either serve `client/dist` from a static host (Vercel, Netlify, S3+CloudFront) **or** mount it from Express.
3. Run the server with `NODE_ENV=production npm --workspace server start`.
4. Set every variable in `server/.env.example` (the env loader **throws** on missing required values when `NODE_ENV=production`).
5. Configure the Paystack dashboard webhook URL: `https://your-domain/api/payments/webhook/paystack`.
6. Configure your Arkesel sender ID (must be approved on the Arkesel dashboard for live sends — sandbox mode bypasses approval).

### Docker

The project is Docker-ready: each workspace has a self-contained `package.json` and standard `npm start` / `npm run dev` scripts. Add a `Dockerfile` per workspace and a `docker-compose.yml` wiring server + client + MongoDB when ready.

---

## What's next (not yet built)

The scaffold is fully runnable end-to-end. Features the original spec mentions that remain to be expanded:

- File upload for product images (currently URL-based) — wire `multer` to S3 / Cloudinary
- Export sales reports as CSV/PDF (data endpoint exists at `/admin/reports/sales`)
- Coupons / discounts engine
- Email channel (in addition to SMS)
- Cypress / Playwright E2E tests (Jest + Supertest already configured for unit/API)
- Multi-vendor model (would require adding a `Vendor` collection and tenant-aware product/order scoping)
- AI product recommendations
