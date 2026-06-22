# ZA Supplier Hub — Launch Checklist (v2)

_Built 2026-06-02. Everything below is code-complete, typechecks, and builds.
The steps here are the ones that need Supabase / Cloudflare access to finish._

## What shipped in v2
- **Working ordering loop** — members order for their customer in-app (`OrderModal` → `place_order` RPC). The RPC computes the amount from the real `cost_price` server-side, so the price can't be tampered with. Orders show live status + tracking under **Orders**.
- **Admin panel** (`/admin`, admin-role gated) — catalogue CRUD + image upload, order fulfilment (status + paid + tracking), member/role management, product-request inbox, support tickets.
- **Account page** — profile + **DropStore account link** (email-based; verified read-only if the AOS Supabase env is set — never touches DropStore's login/device-cap flow).
- **Request a Product** and **Support** are now real DB-backed forms.
- **Premium landing redesign** — Lenis smooth scroll + scroll reveals, honest copy (removed the fabricated "500+/R50M/Trustpilot" claims).
- **Starter catalogue** — 24 representative SA products seeded (only if the catalogue is empty).

## Go-live steps (need access)

### 1. Apply the database migration  ← blocks everything
The Supabase project `jxqyxovqagwttjltagon` is on the Lovable-managed account (not reachable from the workspace MCP/CLI). Apply it one of two ways:
- **SQL editor:** paste `supabase/migrations/20260602120000_supplier_hub_v2.sql` into the Supabase SQL editor and run. It's idempotent + safe to re-run.
- **CLI:** `supabase link --project-ref jxqyxovqagwttjltagon && supabase db push`

> Depends on `20260601090000_reinstate_roles_and_rls.sql` (roles + `has_role` + base RLS). Confirm that one is applied first.

### 2. Make sure you're an admin
The base migration pre-grants `admin` to josh@amalfiai.com, schoemanhenro@, sethpon123@, jankosteyn0@ **if the auth user already exists**. If you signed up after, run once:
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'josh@amalfiai.com'
on conflict do nothing;
insert into public.user_roles (user_id, role)
select id, 'approved' from auth.users where lower(email) = 'josh@amalfiai.com'
on conflict do nothing;
```

### 3. Worker environment (Cloudflare)
Runtime vars the server routes need (set with `wrangler secret put` or in the dashboard):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — server routes (DropStore link, webhook)
- `SUPABASE_SERVICE_ROLE_KEY` — Shopify webhook member provisioning
- `SHOPIFY_WEBHOOK_SECRET` — verify the R99 orders/paid webhook
- _(optional)_ `DROPSTORE_SUPABASE_URL` + `DROPSTORE_SUPABASE_SERVICE_KEY` (AOS project `xxvnsztpujtsedybuyfu`) → turns the DropStore link from soft (email-only) into verified.

Build-time (already in `.env`, baked into the bundle at `bun run build`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `VITE_SHOPIFY_CHECKOUT_URL` — **set this to the live R99 checkout** (currently falls back to the preview URL).

### 4. Deploy
```bash
bun run build
npx wrangler login      # one-time
npx wrangler deploy
```
Ships to `supplier-hub.amalfiai.com`; the `*.workers.dev` URL remains available as a fallback.

### 5. Custom domain — supplier-hub.amalfiai.com
`amalfiai.com` is already on Cloudflare, so no DNS migration needed. In `wrangler.jsonc` add:
```jsonc
"routes": [{ "pattern": "supplier-hub.amalfiai.com", "custom_domain": true }]
```
then `wrangler deploy`. (Branded `app.zasupplierhub.co.za` later via GoDaddy DNS → Cloudflare.)

## Verified
- TypeScript clean (`tsc --noEmit`), production build passes (all routes + worker bundle).
- Landing renders + scrolls correctly (fixed a scroll-killing `overflow-x-clip` bug).
- Code review (bugs + security + silent-failure) passed; 3 issues fixed (supplier_note leak, profile refetch, admin error state).

## Not yet verified (needs steps 1–2)
- End-to-end authenticated flows (placing an order, admin status updates, role grants, DropStore link) against the live DB — these are built + reviewed but not runtime-tested because the migration isn't applied yet.
