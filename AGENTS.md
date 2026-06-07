# ZA Supplier Hub — agent operating brief

Read this before doing anything. It's the whole system: two surfaces (a member site
and a Shopify store) over one Supabase backend.

## The two surfaces

| Surface | What it is | Where |
|---|---|---|
| **Site** | members log in, browse products, track orders | this repo → Cloudflare Worker **`https://zasupplierhub.josh-338.workers.dev`** |
| **Store** | product listings + checkout (members pay supplier cost) | Shopify **`byjbdf-2k.myshopify.com`** (ZAR), Yoco payments |

`zasupplierhub.co.za` currently still points at an OLD Lovable build (access-code login) —
**not** this app. Members must use the worker URL until the GoDaddy DNS is repointed.

## Repo

- GitHub: **`joshburtonza/sourcingsa-supplier-hub`**, branch **`main`**.
- Stack: TanStack Start (React SSR) on Cloudflare Workers, built with Vite (`bun`/`npm`).
- Deploy (code changes only): `npm run build && npx wrangler deploy -c dist/server/wrangler.json`
- **Product loads are pure data — they go live with NO deploy.** Only deploy for code.

## Backend — Supabase project `vcvvkpzgcscwvmzmdpye` (eu-west-1)

Tables (schema `public`):
- **products** — catalogue. Columns: `name, category, cost_price, sell_price, image_url,
  images(jsonb), shopify_url, checkout_url, description, supplier_note, source_id,
  source_query, stock_status, active, trending, sales_count, created_at`.
  RLS: approved members + admins can read; admins write. **Never `select('*')`** to a member
  (leaks `supplier_note`); use explicit columns.
- **orders** — a member's purchases. RLS: a member reads only rows where
  `lower(email)=lower(auth.email())`; admins read all. Written by the Shopify webhook.
- **profiles** — one per member (`id=auth.uid()`), `email, full_name, must_change_password,
  dropstore_tier`. RLS: own row; admins all.
- **paid_customers** — entitlement (who may sign up / membership). `email, shopify_order_id,
  amount, currency, paid_at`. RLS: member reads own; service-role writes.
- **user_roles** — `app_role` enum (`admin|approved`). `has_role(uid, role)` SECURITY DEFINER.
- RPCs: `hub_categories()` (distinct active categories for the dropdown), `register_paid_user()`
  (paywall signup, gated on paid_customers), `has_role()`.

Query it two ways:
- **App/runtime**: anon/publishable key in `.env` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`), RLS applies.
- **Admin/migrations/bulk**: Supabase management API
  `POST https://api.supabase.com/v1/projects/vcvvkpzgcscwvmzmdpye/database/query`
  with `Authorization: Bearer <token>` where token = `security find-generic-password -s "Supabase CLI" -w | base64 -d`,
  and header **`User-Agent: curl/8.7.1`** (Python's UA is Cloudflare-blocked → 403 code 1010).

## Auth / logins

- Members authenticate with **email + password** (Supabase Auth). Provisioned accounts start on a
  shared temp password with `profiles.must_change_password=true`; the app forces a reset on first
  login (`ChangePasswordGate`). Admin = `has_role(uid,'admin')` (josh@amalfiai.com), sees all orders.
- v2 gotcha: **never await a Supabase query inside `onAuthStateChange`** (deadlocks login) — defer with setTimeout.

## Shopify

- Admin API token is minted via **client_credentials** (`SHOPIFY_CLIENT_ID/SECRET` in `.env`),
  lives ~24h. The pipeline caches + re-mints it.
- **Webhook** `POST /api/webhooks/shopify/orders-paid` (handler: `src/routes/api.webhooks.shopify.orders-paid.ts`):
  - HMAC verified against `SHOPIFY_WEBHOOK_SECRET` (= the app client secret).
  - `recordPayment()` → upserts the buyer email into `paid_customers` (so they can sign up).
  - `recordHubOrders()` → writes each line item into `orders` so it shows on the member's
    dashboard. Idempotent on `shopify_order_id`. **Skips the R99 "Get Access" membership product**
    (`ACCESS_VARIANT_IDS` = `51717612273981`, `51793619550525`; product `10346097967421`).
  - Member attribution: checkout carries `note=ZASH:<member-email>` so an order lands on the right
    profile even if they pay with a different email; falls back to the buyer email.
- "Order Now" on the site = a cart permalink `https://byjbdf-2k.myshopify.com/cart/{variant_id}:1?note=ZASH:<email>`.

## Catalogue pipeline (the main recurring job)

`scripts/catalogue/catalogue.py` — Temu CSV → Shopify → hub, one resumable command. See
`scripts/catalogue/README.md`. Pricing is fixed: **cost = Temu + max(R10,10%)**, **sell = 2.5×**.
Idempotent (dedupe by Temu `source_id` + name vs the live DB). Browse filters server-side with
pagination + the `hub_categories()` RPC, so the catalogue scales past Supabase's 1000-row select cap.

## Credentials (never hard-code; all already on the machine)

`.env` (repo root): `SHOPIFY_CLIENT_ID/SECRET/STORE`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`CLOUDFLARE_API_TOKEN` (deploy), `OXYLABS_USER/PASS` (scraping). Supabase admin token: keychain
(`Supabase CLI`). **Never commit `.env` or paste secrets.**

## Hard rules

- Pricing (Temu+10%/R10 cost, 2.5× resell) is fixed.
- Product loads = data only → no deploy. Deploy only for code changes.
- Reuse existing categories where they fit; keep names broad ("Pet Products", not "Dog Beds").
- Verify scraped images match titles before publishing (montage snippet in the catalogue README).
