# Catalogue pipeline — Temu scrape → Shopify → hub

Turns a Temu product CSV into live, filterable products on the ZA Supplier Hub.

## The two systems

| | What | Where |
|---|---|---|
| **Site** | the member app (this repo) | `joshburtonza/sourcingsa-supplier-hub` → Cloudflare Worker `https://zasupplierhub.josh-338.workers.dev`, backend Supabase `vcvvkpzgcscwvmzmdpye` |
| **Store** | product listings + checkout | Shopify `byjbdf-2k.myshopify.com` (ZAR), Admin API, Yoco payments |

Members browse on the **site** (products read from Supabase); "Order Now" sends them to a **Shopify** cart permalink to pay supplier cost.

## One command

```bash
cd scripts/catalogue
python3 catalogue.py all --csv /path/to/scrape.csv --category "Pet Products"
```

Runs: **normalize → create (Shopify) → enrich (CDN images) → load (Supabase)**. Resumable — re-run the same command and it skips what's done (checkpoint in `.work/`). Run a single stage by replacing `all` with `normalize` | `create` | `enrich` | `load`.

## What it does

1. **normalize** — auto-detects the CSV columns (handles both the `title/price/image_url` and `Product Title/Price (ZAR)/Image URL` shapes), drops rows with no price (`N/A`), and **dedupes** within the file and against the live DB (by Temu `product_id` and by product name) so re-scrapes never double-list. When Temu blocks apparel detail variants, the pipeline adds age-appropriate size bands and only adds colours explicitly named by the listing.
2. **create** — lists each product in Shopify (active, ZAR), creates variants from detected colour/size columns where present, and captures the variant/cart links. ~2/s (Shopify rate limit), so ~500 products ≈ 25 min.
3. **enrich** — swaps the Temu image for the Shopify-hosted CDN copy (no hotlink risk).
4. **load** — inserts into `public.products`, which is what the site shows.

## Pricing (house rules — don't change without Josh)

- `cost_price` (member pays you) = **Temu price + max(R10, 10%)**
- `sell_price` (suggested resell) = **round(cost_price × 2.5)**
- `checkout_url` = `https://byjbdf-2k.myshopify.com/cart/{variant_id}:1`

## products table (columns the pipeline writes)

`name, category, cost_price, sell_price, image_url, description, shopify_url, checkout_url, source_id, variant_options, variant_map, stock_status='in_stock', active=true`

The site's category dropdown is driven by the `hub_categories()` RPC (distinct active categories), and browse filters **server-side** with pagination — so any number of categories/products works.

## Credentials (never hard-code; the script reads these)

- `../../.env` → `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_STORE` (Shopify token is minted via client_credentials, cached in `.work/`)
- macOS keychain → Supabase management-API token: `security find-generic-password -s "Supabase CLI" -w` (base64). The Management API needs header `User-Agent: curl/8.7.1` (Python's UA is Cloudflare-blocked → 403).

## Verify images before publishing (Josh's bar: images must match the product)

```bash
# montage a sample of the normalized queue to eyeball that images match titles
python3 - <<'PY'
import json,urllib.request,subprocess,os
q=json.load(open('.work/queue.json')); os.makedirs('.work/grid',exist_ok=True)
s=q[::max(1,len(q)//30)][:30]; m=[]
for i,r in enumerate(s):
    fn=f'.work/grid/{i}.jpg'; urllib.request.urlretrieve(r['image_url'],fn); m.append((fn,r['name'][:20]))
a=['montage','-font','/System/Library/Fonts/Supplemental/Arial.ttf']
for fn,nm in m: a+=['-label',nm,fn]
subprocess.run(a+['-tile','6x','-geometry','190x190+5+24','-pointsize','11','.work/grid/grid.png'])
print('open .work/grid/grid.png')
PY
```

## Deploy the site (only if you changed site code, NOT for product loads)

Product loads are pure data — they appear live with no deploy. Only redeploy for code changes:
```bash
npm run build && npx wrangler deploy -c dist/server/wrangler.json
```
