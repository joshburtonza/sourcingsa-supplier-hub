# ZA Supplier Hub — Full Redesign Implementation Plan

> **For agentic workers:** No automated test suite exists in this repo (no vitest/playwright config found). This plan substitutes TDD steps with **BrowserMCP visual verification** — screenshot the affected route after each task and compare against the mockup/spec before moving on, per the workspace's standard UI-change workflow. Execute task-by-task, committing after each.

**Goal:** Port the new dark-blue "Vault" visual design (from the two static HTML mockups in `/Users/henryburton/.openclaw/workspace-anthropic/supplier hub/`) into the live `sourcingsa-supplier-hub` TanStack Start app — landing page and member dashboard as pixel-close ports with real Supabase data, everything else (admin, tools, auth, standalone pages) re-skinned to the same design system since no mockup exists for them.

**Architecture:** Token-first, then component-by-component. Because the app already channels almost all color through CSS custom properties (`--primary`, `--card`, `--border`, etc. in `src/styles.css`), swapping the accent from purple (`#7B5EE8`) to blue (`#168bf8`) at the token layer cascades correctly through `AdminShell`, `ProtectedShell`, and most inner pages for free. The two pages built with literal hex values and bespoke layouts — `index.tsx` (landing) and `dashboard.tsx` (member dashboard) — get full rebuilds against the mockups. Everything else gets verified after the token swap and patched only where it visibly breaks or looks dated next to the new landing/dashboard.

**Tech Stack:** TanStack Start, React 19, Tailwind v4 (CSS-var theme, no config file), shadcn/ui (Radix primitives), Supabase (`@supabase/supabase-js`), TanStack Query/Router. Animations: plain CSS (`.reveal`/`.fade-in-up` keyframes already in `styles.css`) + Lenis (`src/components/landing/motion.tsx`) — no GSAP in this repo, don't introduce it.

**Source mockups (reference only, not part of the build):**
- `/Users/henryburton/.openclaw/workspace-anthropic/supplier hub/ZA Supplier Hub - Website.html`
- `/Users/henryburton/.openclaw/workspace-anthropic/supplier hub/ZA Supplier Hub - Dashboard.html`

**Branch:** `redesign/za-supplier-hub-v2` (already created off `main`, working tree clean at plan time).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/styles.css` | Modify | Swap `--primary`/`--primary-hover`/`--accent`/`--ring` to blue scale; add `--blue-lighter`/`--blue-dim`/`--blue-line`/`--green`/`--amber` tokens matching mockup; rename/retint `.glass-pill-purple` → keep class name (used in 15+ places) but retint to blue; retint `.hero-glow`, `.text-gradient`, `.glow-card*`, `.glow-btn`. |
| `src/routes/index.tsx` | Rewrite | Landing page — full port of `ZA Supplier Hub - Website.html` sections into React/Tailwind, wired to real `CHECKOUT_URL`/`fmtZAR`. |
| `src/components/landing/Console.tsx` | Create | The animated "live fulfilment console" hero visual (KPI tiles, revenue bars, delivery rail, scrolling order feed) — pulled out of `index.tsx` into its own component since it's self-contained and reused nowhere else, keeps `index.tsx` a manageable size. |
| `src/components/landing/DashboardPreviews.tsx`, `FloatingDashboardMockup.tsx`, `Trending.tsx` | Delete | Confirmed dead code (unimported). Superseded by the new `Console.tsx` + real dashboard. Confirm with Josh before deleting (Task 1). |
| `src/routes/dashboard.tsx` | Rewrite | Member dashboard — port `ZA Supplier Hub - Dashboard.html` overview view, wired to real `orders`/`products`/`paid_customers` queries already in the current file. |
| `src/components/dashboard/KpiCard.tsx` | Create | Reusable KPI tile (icon, label, value, delta) — mockup uses this pattern 4× on overview, replaces ad-hoc `StatCard` in current `dashboard.tsx`. |
| `src/components/dashboard/RevenueChart.tsx` | Create | 90-day bar chart component (mockup's `.bars`/`.c-bars`), driven by real order data grouped by day. |
| `src/components/dashboard/ProfitWaterfall.tsx` | Create | Revenue → stock cost → net margin bar breakdown (mockup's `.wf` block) — real version needs product cost data joined against orders. |
| `src/components/dashboard/ProvinceBreakdown.tsx` | Create | "Where your orders are going" list, grouped from real order shipping addresses. |
| `src/components/dashboard/DeliveryRail.tsx` | Create | Order-tracking progress rail (Placed→Packed→In transit→Delivered), reused on dashboard "Active shipments" card and on `orders.tsx` detail panel — extract now to avoid duplicating it in Task 8. |
| `src/components/MemberSidebar.tsx` | Modify | **Read first (not yet reviewed) — Task 0.** Likely needs the new nav-pill active-state treatment and count badges (Browse/Orders/Stock) from the mockup sidebar. |
| `src/components/AdminShell.tsx` | Modify | Retint only if token swap leaves anything visually off (e.g. hardcoded rgba purple anywhere) — audit in Task 9. |
| `src/components/PublicNavbar.tsx` | Modify | Retint `glass-pill-purple` usage and the icon-mark background (currently inline `rgba(107,79,232,...)`, hardcoded — needs literal swap since it doesn't use the CSS var). |
| `src/routes/orders.tsx`, `products.tsx`, `product.$id.tsx`, `account.tsx`, `trending.tsx` | Verify, patch as needed | Token swap should carry these; visually diff each against the new dashboard for consistency (spacing, card treatment) since they weren't in the original mockup. |
| `src/routes/admin.tsx`, `admin.members.tsx`, `admin.orders.tsx`, `admin.products.tsx`, `admin.requests.tsx`, `admin.support.tsx` | Verify, patch as needed | Same — token swap first, then a pass to bring card/table treatment in line with the new KPI-tile visual language where cheap to do (e.g. reuse `KpiCard` on `admin.tsx` overview). |
| `src/routes/tools.*`, `how-to-order.tsx`, `request-product.tsx`, `support.tsx`, `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx` | Verify, patch as needed | Token swap pass; no bespoke redesign unless something reads broken next to the new pages. |

---

## Task 0: Pre-flight — read what wasn't read yet, confirm dead-code deletion

**Files:** `src/components/MemberSidebar.tsx`, `src/components/ProductBrowser.tsx` (or wherever it lives — `grep -r "NicheRecommender\|ProductBrowser" src/components`), `src/components/landing/DashboardPreviews.tsx`, `FloatingDashboardMockup.tsx`, `Trending.tsx`

- [ ] **Step 1:** Read `MemberSidebar.tsx` in full — this holds the actual member nav chrome that `ProtectedShell` renders; the mockup's sidebar (nav-pill slide, count badges, avatar footer) needs to land here. Confirmed: its nav array is currently static (`{to, label, icon}`, no data fetching) — Task 5's count badges will need a new fetch (or a prop passed down from wherever it's mounted), not an existing hook to tap into.
- [ ] **Step 2:** Locate and read `ProductBrowser`/`NicheRecommender` (imported by `products.tsx`/`trending.tsx`) — these likely carry the bulk of the products-page visual surface; confirm they use CSS vars (not hardcoded hex) before assuming the token swap covers them.
- [ ] **Step 3:** Confirm with Josh (WhatsApp or in-session) that `DashboardPreviews.tsx`, `FloatingDashboardMockup.tsx`, `Trending.tsx` (in `src/components/landing/`) are safe to delete — grep confirmed zero imports, but double-check nothing references them dynamically (e.g. a Storybook file, a lazy import string) before removing.
- [ ] **Step 4:** `git rm` the confirmed-dead files, commit.

```bash
git rm src/components/landing/DashboardPreviews.tsx src/components/landing/FloatingDashboardMockup.tsx src/components/landing/Trending.tsx
git commit -m "chore: remove unused landing mock components"
```

---

## Task 1: Theme tokens — blue accent swap

**Files:** Modify `src/styles.css`

- [ ] **Step 1:** Add new tokens to `:root` in `src/styles.css` alongside the existing ones (keep `--primary` etc. as the names other files reference — don't rename, just retint):

```css
:root {
  --radius: 1rem;
  --background: #05060F;
  --foreground: #FFFFFF;
  --card: #0D0E1A;
  --card-foreground: #FFFFFF;
  --popover: #0D0E1A;
  --popover-foreground: #FFFFFF;
  --primary: #168bf8;
  --primary-foreground: #FFFFFF;
  --primary-hover: #2998ff;
  --secondary: #0D0E1A;
  --secondary-foreground: #FFFFFF;
  --muted: #0D0E1A;
  --muted-foreground: #A1A1AA;
  --accent: #168bf8;
  --accent-foreground: #FFFFFF;
  --destructive: #ef4444;
  --destructive-foreground: #FFFFFF;
  --border: rgba(255,255,255,0.08);
  --input: rgba(255,255,255,0.1);
  --ring: #168bf8;
  --success: #22c55e;
  /* new — mockup's extended blue scale + status colors */
  --blue-lighter: #4cb8ff;
  --blue-dim: rgba(22,139,248,.12);
  --blue-line: rgba(22,139,248,.28);
  --amber: #FFB020;
}
```

- [ ] **Step 2:** Retint the purple-hardcoded utility classes in the same file — `glow-card`, `glow-btn`, `text-gradient`, `hero-glow`, `.glass-pill-purple` — replace every `rgba(107,79,232,` and `#7B5EE8`/`#9277ff`/`#b9aef6` with the blue equivalents (`22,139,248`, `#168bf8`, `#4cb8ff`, `#cfe4ff`).
- [ ] **Step 3:** `grep -rn "7B5EE8\|9277ff\|b9aef6\|107, ?79, ?232\|107,79,232" src` — this finds every literal hex/rgba reference outside `styles.css` that the token swap won't reach (per the structural map, `index.tsx` and `PublicNavbar.tsx` are known offenders). Note the file list for Tasks 3 and 9.
- [ ] **Step 4:** Run `pnpm dev` (or `npm run dev`/`bun dev` — check `package.json` scripts, `bun.lock` present suggests Bun), open `/login` in BrowserMCP (simplest page, mostly CSS-var driven, good smoke test), screenshot, confirm the accent reads blue not purple.
- [ ] **Step 5:** Commit.

```bash
git add src/styles.css
git commit -m "feat: swap accent theme from purple to blue"
```

---

## Task 2: Landing page — hero + console

**Files:** Create `src/components/landing/Console.tsx`; Modify `src/routes/index.tsx:1-150` (hero section)

- [ ] **Step 1:** Build `Console.tsx` porting the mockup's `.console` block (`ZA Supplier Hub - Website.html` lines ~740-838) — KPI tiles (revenue/orders/margin with count-up), 90-day bar chart, delivery rail, scrolling order feed. Use CSS-only animation (`@keyframes` in a `<style>` block or a small companion CSS file) matching the mockup's `grow`/`shimmer`/`travel`/`feedup` keyframes — don't reach for GSAP, the mockup itself is vanilla CSS and this repo has no GSAP dependency.
- [ ] **Step 2:** Wire the count-up numbers via a small `useCountUp(target, prefix)` hook (mockup uses `data-count`/`data-prefix` attrs read by vanilla JS on scroll-into-view — reimplement as a React hook using `IntersectionObserver`, consistent with the existing `Reveal` component in `motion.tsx`).
- [ ] **Step 3:** Replace the current hero markup in `index.tsx` with the new headline ("Selling products that never arrive? Fix your fulfilment."), lede, CTA row, micro-proof line, and `<Console />` in place of the old inline mock.
- [ ] **Step 4:** BrowserMCP: navigate to `/`, screenshot hero section, compare against `ZA Supplier Hub - Website.html` opened directly in a browser tab side-by-side.
- [ ] **Step 5:** Commit.

```bash
git add src/components/landing/Console.tsx src/routes/index.tsx
git commit -m "feat: port landing hero and fulfilment console from mockup"
```

---

## Task 3: Landing page — remaining sections

**Files:** Modify `src/routes/index.tsx` (rest of file)

- [ ] **Step 1:** Port category strip (scrolling marquee of category names), "How it works" 3-step grid, shipping band, feature splits, stat band, pricing cards (R99/R250), FAQ accordion (reuse existing `@/components/ui/accordion` if the current landing already uses it — check), final CTA, footer — matching mockup structure/copy, wired to real `CHECKOUT_URL`.
- [ ] **Step 2:** Delete the old inline `PREVIEW`/`FEED` hardcoded-array mock panels and `SalesOverviewMock`/`OrderFeedMock` components now superseded by `Console.tsx`.
- [ ] **Step 3:** Sweep for any remaining literal hex from the Task 1 Step 3 grep output within this file — replace with `var(--primary)` etc.
- [ ] **Step 4:** BrowserMCP: full-page screenshot at desktop (1440px) and mobile (390px) width, scroll through every section, verify no layout breaks, verify `overflow-x: clip` is used if any wrapper needs horizontal overflow control (per workspace-wide iOS Safari rule — grep this file for `overflow-x: hidden` and fix if found).
- [ ] **Step 5:** Commit.

```bash
git add src/routes/index.tsx
git commit -m "feat: port remaining landing sections from mockup"
```

---

## Task 4: PublicNavbar retint

**Files:** Modify `src/components/PublicNavbar.tsx`

- [ ] **Step 1:** Replace the hardcoded `rgba(107,79,232,0.25)` / `rgba(107,79,232,0.5)` icon-mark background/border with the blue equivalents, and update the brand mark icon if the mockup uses a different glyph (mockup uses a stacked-triangle "hub" mark, current uses a `Zap` lucide icon — decide: keep `Zap` for simplicity, or swap to match mockup exactly. Default to keeping `Zap` unless Josh flags it, to minimize new SVG work).
- [ ] **Step 2:** BrowserMCP screenshot header on `/`, confirm blue.
- [ ] **Step 3:** Commit.

```bash
git add src/components/PublicNavbar.tsx
git commit -m "fix: retint public navbar accent to blue"
```

---

## Task 5: Member sidebar — nav pill + count badges

**Files:** Modify `src/components/MemberSidebar.tsx` (read in Task 0 — exact line refs added once read)

- [ ] **Step 1:** Add the sliding active-nav-pill treatment from the mockup (`.nav-pill` — an absolutely-positioned element that translates between nav items on route change, `transition: transform .42s var(--ease)`). Implement via a `ref` per nav item + `useLayoutEffect` measuring `offsetTop`/`offsetHeight` of the active item, translating the pill — don't port the mockup's raw DOM-measurement JS verbatim, adapt to React refs.
- [ ] **Step 2:** Add count badges next to nav items where real counts exist (Browse products → product count, My orders → open order count) — pull these from whatever query the sidebar already has access to, or lift counts up from `dashboard.tsx`'s existing `Promise.all` fetch if the sidebar doesn't fetch its own data today (check Task 0 findings).
- [ ] **Step 3:** BrowserMCP screenshot `/dashboard` sidebar, click between nav items, confirm the pill slides.
- [ ] **Step 4:** Commit.

```bash
git add src/components/MemberSidebar.tsx
git commit -m "feat: add sliding nav pill and count badges to member sidebar"
```

---

## Task 6: Dashboard overview — KPI tiles + revenue chart

**Files:** Create `src/components/dashboard/KpiCard.tsx`, `RevenueChart.tsx`; Modify `src/routes/dashboard.tsx`

- [ ] **Step 1:** Build `KpiCard.tsx` — icon, label, value (with bump animation on change via a `key`-remount or CSS class toggle), delta text. Props: `icon`, `label`, `value`, `delta`, `deltaTone?: 'up' | 'neutral'`.
- [ ] **Step 2:** Build `RevenueChart.tsx` — takes an array of `{date, total}` and renders the mockup's animated bar chart (bars grow on mount via CSS `scaleY` transition, last bar highlighted). Real data: group the existing `orders` fetch by day for the last 90 days client-side (no new Supabase query needed — `dashboard.tsx` already fetches all orders).
- [ ] **Step 3:** Replace the current 6 ad-hoc `StatCard`s in `dashboard.tsx` with 4 `KpiCard`s matching the mockup's overview (Revenue today, Orders placed, Your margin today, In transit) — decide what happens to the 2 stats that don't map (awaiting/delivered/member-since) — fold into secondary cards below or the province/leaderboard cards in Task 7, don't just drop data silently.
- [ ] **Step 4:** BrowserMCP screenshot `/dashboard`, confirm KPI row and chart render with real numbers (not the mockup's hardcoded R48,260 etc.).
- [ ] **Step 5:** Commit.

```bash
git add src/components/dashboard/KpiCard.tsx src/components/dashboard/RevenueChart.tsx src/routes/dashboard.tsx
git commit -m "feat: port dashboard KPI tiles and revenue chart with real data"
```

---

## Task 7: Dashboard overview — profit waterfall, province breakdown, leaderboard, active shipments

**Files:** Create `src/components/dashboard/ProfitWaterfall.tsx`, `ProvinceBreakdown.tsx`, `DeliveryRail.tsx`; Modify `src/routes/dashboard.tsx`

- [ ] **Step 1:** `ProfitWaterfall.tsx` — `orders` rows store `unit_cost` directly (confirmed in `src/integrations/supabase/types.ts`), so COGS is snapshotted at sale time — no join to `products.cost_price` and no historical-drift risk. Compute waterfall as `revenue = sum(sell_price * qty)`, `cogs = sum(unit_cost * qty)`, `net = revenue - cogs`.
- [ ] **Step 2:** `ProvinceBreakdown.tsx` — group real orders by shipping province (check `orders` schema for the field name), render as the mockup's ranked list with progress bars.
- [ ] **Step 3:** `DeliveryRail.tsx` — extract the Placed→Packed→In transit→Delivered progress bar as a standalone component (also needed by `orders.tsx` order-detail panel in Task 8), driven by the order's `status` field.
- [ ] **Step 4:** Wire "Active shipments" card (dashboard) to render 2-3 `DeliveryRail`s for the member's most recent in-transit orders. Wire "Top products by profit" leaderboard from existing order data grouped by product.
- [ ] **Step 5:** BrowserMCP screenshot, verify all four new cards render with real data and no placeholder numbers remain.
- [ ] **Step 6:** Commit.

```bash
git add src/components/dashboard/ProfitWaterfall.tsx src/components/dashboard/ProvinceBreakdown.tsx src/components/dashboard/DeliveryRail.tsx src/routes/dashboard.tsx
git commit -m "feat: port dashboard waterfall, province breakdown, leaderboard, active shipments"
```

---

## Task 8: Orders page — apply DeliveryRail, verify token swap held

**Files:** Modify `src/routes/orders.tsx`

- [ ] **Step 1:** Swap the order-detail slide-over's tracking display to use the new `DeliveryRail` component from Task 7 for visual consistency with the dashboard.
- [ ] **Step 2:** BrowserMCP screenshot `/orders`, confirm stat-filter chips, table, and slide-over all read as blue-accent and match the dashboard's card styling (border radius, `--panel`/`--card` background).
- [ ] **Step 3:** Commit.

```bash
git add src/routes/orders.tsx
git commit -m "fix: use shared DeliveryRail on orders page"
```

---

## Task 9: Verification pass — products, product detail, account, trending, tools, auth, admin, standalone pages

**Files:** No planned edits — audit-and-patch only, list grows based on findings.

- [ ] **Step 1:** BrowserMCP through every remaining route at both desktop and mobile width: `/products`, `/product/:id` (any real id), `/account`, `/trending`, `/tools`, `/tools/ad-generator`, `/tools/niche-finder`, `/tools/product-validator`, `/tools/profit-calculator`, `/how-to-order`, `/request-product`, `/support`, `/login`, `/signup`, `/admin`, `/admin/products`, `/admin/orders`, `/admin/requests`, `/admin/members`, `/admin/support`. Screenshot each.
- [ ] **Step 2:** For each screenshot, check: (a) accent reads blue not purple — catches any literal hex the Task 1 grep missed, (b) card/border treatment visually matches the new dashboard's density and radius, (c) nothing looks broken from the token swap (e.g. a low-contrast combination that happened to work with purple but not blue).
- [ ] **Step 3:** Patch anything that fails (b) or (c) — likely candidates per the structural map: `admin.tsx` overview cards (retrofit `KpiCard` from Task 6 here for consistency, optional but cheap), `login.tsx`/`signup.tsx` (300+236 LOC, worth a careful look since they're the first thing new members see).
- [ ] **Step 4:** Commit each patch separately as found (don't batch unrelated route fixes into one commit).

---

## Task 10: Full regression pass + PR

**Files:** None (verification + process)

- [ ] **Step 1:** Run `pnpm lint` / `bun run lint` — fix anything the redesign introduced.
- [ ] **Step 2:** Run `pnpm build` / `bun run build` — confirm no TanStack Start / Tailwind v4 build errors (Tailwind v4's `@source` scanning can silently miss classes added in new files outside `src/` — double check `Console.tsx` etc. are under `src/` so `@source "../src"` in `styles.css` picks them up).
- [ ] **Step 3:** Full click-through as an actual member account in BrowserMCP: sign up flow (or login as an existing test member if Josh has one), dashboard, place-order flow if testable, admin flows as an admin test account.
- [ ] **Step 4:** Run the mandatory pre-deploy review agents per workspace CLAUDE.md: `pr-review-toolkit:code-reviewer` and `pr-review-toolkit:silent-failure-hunter` on `git diff main` (or `git diff HEAD~N` covering all redesign commits). Fix criticals.
- [ ] **Step 5:** Open PR from `redesign/za-supplier-hub-v2` → `main` for Josh's review. Do NOT merge or deploy without explicit approval — this is a live client-facing app.

```bash
git push -u origin redesign/za-supplier-hub-v2
gh pr create --title "ZA Supplier Hub: blue theme redesign (landing + dashboard port + full app retint)" --body "..."
```

---

## Resolved decisions (during execution)

- **Pricing model conflict (found during Task 2 prep):** mockups describe a recurring subscription (R250/mo, R99/mo student rate). The live app is actually **R99 once-off, lifetime access** (`ProtectedShell.tsx`, `signup.tsx`'s `register_paid_user` RPC, existing footer copy all confirm this). Decision: keep the real once-off pricing model and copy. Port the mockup's *visual* pricing card treatment only — swap "R99/mo" framing for "R99 once-off · lifetime access" everywhere it appears (landing pricing section, dashboard account/membership card, any card mentioning "student rate").

## Open questions to resolve with Josh before/during execution

1. **Brand mark icon** — mockup uses a stacked-triangle glyph, live navbar uses a lucide `Zap` icon. Keep `Zap` (default in Task 4) or commission/port the mockup's exact mark?
2. **Profit waterfall data gap** (Task 7, Step 1) — does the `orders` table snapshot product cost at sale time, or does computing real COGS need a join that could be wrong for historical orders if `products.cost_price` has changed since? Flag once confirmed during Task 7.
3. **Admin/tools redesign depth** — this plan treats admin/tools as "token swap + spot patch" (Task 9) since no mockup exists for them. If Josh wants those redesigned to the same depth as landing/dashboard, that's a second plan (needs its own mockups or design direction first).
