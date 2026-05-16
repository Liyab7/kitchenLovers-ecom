# Deploying to Render

This repo ships with a [Blueprint](./render.yaml) that provisions everything in one go:

- **kitchen-ecom-api** — Node web service (Express + Socket.IO) with a 1GB persistent disk mounted at `/var/data/uploads` for product images
- **kitchen-ecom-web** — Static site for the Vite React PWA

MongoDB is **not** provisioned by Render (no managed Mongo). Use [MongoDB Atlas](https://www.mongodb.com/atlas) — the free M0 tier is enough to get started.

---

## 1. One-time prerequisites

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Create a MongoDB Atlas cluster:
   - New project → Build a Database → **M0 Free**
   - Database Access → add a user (write down the password)
   - Network Access → **Allow access from anywhere** (`0.0.0.0/0`) — Render's outbound IPs aren't fixed on lower plans
   - Cluster → Connect → Drivers → copy the `mongodb+srv://...` connection string
   - Edit the string: replace `<password>` and append your DB name, e.g. `/kitchen_ecom?retryWrites=true&w=majority`
3. (Optional) Get production keys ready:
   - Paystack live secret/public/webhook secret
   - Arkesel API key + approved sender ID

If you skip the third-party keys, the app boots in **stub mode** (OTPs logged to the server console, checkout auto-succeeds at `/checkout/stub-pay`). Useful for a first deploy.

---

## 2. Create the Blueprint on Render

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**
2. Connect the repo. Render reads `render.yaml` from the root.
3. Confirm both services. Click **Apply**.

The static site will fail to build the very first time — that's expected, because `VITE_API_URL` isn't set yet. The next steps fix that.

---

## 3. Fill in the API secrets

Open **kitchen-ecom-api** → **Environment**. Render auto-generated `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Fill in the rest:

| Key | Value |
| --- | --- |
| `MONGO_URI` | the Atlas connection string from step 1 |
| `SEED_SUPER_ADMIN_PHONE` | e.g. `+233500000000` (E.164 with `+`) |
| `SEED_SUPER_ADMIN_PASSWORD` | a strong password — you'll log in with this |
| `PAYSTACK_SECRET_KEY` | live `sk_live_...` or leave blank for stub mode |
| `PAYSTACK_PUBLIC_KEY` | live `pk_live_...` (also goes into the static site env) |
| `PAYSTACK_WEBHOOK_SECRET` | from the Paystack dashboard webhook page |
| `ARKESEL_API_KEY` | leave blank for stub mode |
| `CLIENT_URL` | will be set in step 5 |
| `PUBLIC_URL` | will be set in step 5 |

Save. The service redeploys.

---

## 4. Seed the database (one-time)

After the API service is healthy (green dot, `/api/health` returns `200`):

1. **kitchen-ecom-api** → **Shell** tab
2. Run: `npm run seed`

This creates the Super Admin, roles, sample categories, and a default storefront setting. Re-running is safe (the seed is idempotent on the user/role records).

---

## 5. Wire the two services together

Now you know each service's public URL — copy them from the top of each dashboard page.

**kitchen-ecom-api → Environment:**

| Key | Value (example) |
| --- | --- |
| `CLIENT_URL` | `https://kitchen-ecom-web.onrender.com` (add more origins comma-separated if you map a custom domain) |
| `PUBLIC_URL` | `https://kitchen-ecom-api.onrender.com` |

**kitchen-ecom-web → Environment:**

| Key | Value (example) |
| --- | --- |
| `VITE_API_URL` | `https://kitchen-ecom-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://kitchen-ecom-api.onrender.com` |
| `VITE_PAYSTACK_PUBLIC_KEY` | your `pk_live_...` (or leave blank in stub mode) |
| `VITE_WHATSAPP_NUMBER` | E.164 digits only, no `+`, e.g. `233240000000` |

Trigger a **Manual Deploy** on the static site so Vite picks up the new vars (Vite bakes them in at build time).

---

## 6. Set the Paystack webhook (production keys only)

Paystack Dashboard → Settings → API Keys & Webhooks:

- Webhook URL: `https://kitchen-ecom-api.onrender.com/api/payments/webhook/paystack`
- Use the same secret you set as `PAYSTACK_WEBHOOK_SECRET`

---

## 7. Smoke test

1. Visit the static site URL → home should load with sample categories.
2. Register a new account (the OTP either arrives by SMS or — in stub mode — appears in the **kitchen-ecom-api** logs).
3. Sign in as Super Admin with `SEED_SUPER_ADMIN_PHONE` / `SEED_SUPER_ADMIN_PASSWORD`.
4. Upload a product image (admin panel) → verify it loads. The URL should look like `https://kitchen-ecom-api.onrender.com/uploads/image-...jpg`.
5. Place a test order. Stub mode → redirects to `/checkout/stub-pay`. Live mode → Paystack checkout.

---

## What lives where

| Concern | Location |
| --- | --- |
| HTML/JS/CSS bundle | static site CDN (kitchen-ecom-web) |
| API + WebSocket | web service (kitchen-ecom-api) |
| MongoDB | Atlas (external) |
| Product images | Render disk at `/var/data/uploads` on the API service |
| Refresh tokens, sessions | MongoDB (no Redis needed) |

The Render disk survives deploys and restarts. It's tied to the API service — if you delete the service, the disk goes with it. To migrate, use Render's "create snapshot" feature, or `rsync` files out via the Shell tab.

---

## Custom domains

1. **kitchen-ecom-web → Settings → Custom Domains** → add `shop.example.com` (Render issues a free LetsEncrypt cert).
2. **kitchen-ecom-api → Settings → Custom Domains** → add `api.example.com`.
3. Update env vars to the new origins:
   - API `CLIENT_URL` → `https://shop.example.com` (or comma-separated with the old `*.onrender.com` if you want both to keep working)
   - API `PUBLIC_URL` → `https://api.example.com`
   - Web `VITE_API_URL` → `https://api.example.com/api`
   - Web `VITE_SOCKET_URL` → `https://api.example.com`
4. Redeploy the static site so the new build inlines the new `VITE_*` values.

---

## Cost snapshot (USD, current Render pricing)

- API service: Starter $7/mo (disk requires Starter or higher)
- Disk: 1GB ≈ $0.25/mo
- Static site: free
- MongoDB Atlas M0: free
- **Total: ~$7-8/mo** to start

To cut cost further: switch to **Ephemeral uploads** (free, but images disappear on every deploy/restart) or move uploads to Cloudinary (free tier) — both require small changes to `server/src/routes/upload.routes.js`.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Static site shows API errors (`Network Error`) | `VITE_API_URL` not set, or set without the `/api` suffix |
| `CORS: origin ... not allowed` in API logs | `CLIENT_URL` on the API service doesn't match the static-site origin |
| Uploaded images return 404 | `PUBLIC_URL` not set, or pointing at a wrong host |
| Socket.IO won't connect | `VITE_SOCKET_URL` set with a trailing `/api` (it must be the root, not the API path) |
| `Missing required env var: MONGO_URI` in logs | secret not filled in step 3 |
| Login works but refresh fails | clock skew or wrong `JWT_REFRESH_SECRET` — regenerate and redeploy |
