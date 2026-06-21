#!/usr/bin/env python3
"""
ZA Supplier Hub catalogue pipeline:  Temu CSV  ->  Shopify  ->  hub (Supabase).

One command does the lot:
    python3 catalogue.py all --csv /path/to/scrape.csv --category "Pet Products"

Stages (each re-runnable on its own; all are resumable via checkpoints):
    normalize  read CSV, auto-detect columns, drop no-price rows, dedupe (within the
               file AND against the live DB by Temu id + name), price it, write .work/queue.json
    create     create each product in Shopify (captures the variant id for the cart link)
    enrich     replace the Temu image with the Shopify-CDN copy (no hotlink risk)
    load       insert everything into public.products so it shows on the site

Pricing (house rules):
    cost_price  (what the member pays you)  = Temu price + max(R10, 10%)
    sell_price  (suggested resell)          = round(cost_price * 2.5)

Idempotent: a product already in the DB (same Temu id, or same name) is skipped, so you
can re-run scrapes without creating duplicates.

Credentials (never hard-coded):
    ../../.env            SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_STORE
    macOS keychain        Supabase management-API token  ->  service: "Supabase CLI"
"""
import argparse, csv, itertools, json, os, re, subprocess, time, urllib.request, urllib.error, base64

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))      # hub repo root (has .env)
WORK = os.path.join(HERE, ".work")
os.makedirs(WORK, exist_ok=True)
ENV_FILE = os.path.join(ROOT, ".env")
PROJECT_REF = "vcvvkpzgcscwvmzmdpye"                          # our Supabase project
STORE = "byjbdf-2k.myshopify.com"
API = f"https://{STORE}/admin/api/2024-10"
QUEUE = os.path.join(WORK, "queue.json")
CKPT = os.path.join(WORK, "shopify_ckpt.json")
TOKFILE = os.path.join(WORK, "shopify_tok")
DASH = {"—": "-", "–": "-", "―": "-"}

# ───────────────────────── credentials ─────────────────────────

def env(key):
    for line in open(ENV_FILE, encoding="utf-8"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(f"{key} not found in {ENV_FILE}")


def mgmt_token():
    raw = subprocess.check_output(["security", "find-generic-password", "-s", "Supabase CLI", "-w"]).strip()
    try:
        return base64.b64decode(raw).decode().strip()
    except Exception:
        return raw.decode().strip()


def mgmt_query(sql):
    body = json.dumps({"query": sql}).encode()
    r = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=body, method="POST",
        headers={"Authorization": "Bearer " + mgmt_token(),
                 "Content-Type": "application/json",
                 "User-Agent": "curl/8.7.1"})       # python UA is Cloudflare-blocked (403)
    with urllib.request.urlopen(r, timeout=120) as x:
        return json.loads(x.read())


def shopify_token():
    # client_credentials token lives ~24h; cache + re-mint on 401.
    if os.path.exists(TOKFILE):
        t = open(TOKFILE).read().strip()
        try:
            req = urllib.request.Request(API + "/shop.json", headers={"X-Shopify-Access-Token": t})
            urllib.request.urlopen(req, timeout=15)
            return t
        except urllib.error.HTTPError:
            pass
    data = json.dumps({"client_id": env("SHOPIFY_CLIENT_ID"),
                       "client_secret": env("SHOPIFY_CLIENT_SECRET"),
                       "grant_type": "client_credentials"}).encode()
    req = urllib.request.Request(f"https://{STORE}/admin/oauth/access_token", data=data,
                                 headers={"Content-Type": "application/json"})
    t = json.loads(urllib.request.urlopen(req, timeout=20).read())["access_token"]
    open(TOKFILE, "w").write(t)
    return t

# ───────────────────────── helpers ─────────────────────────

def dedash(s):
    for d, h in DASH.items():
        s = s.replace(d, h)
    return s


def fixcaps(s):
    for a, b in [("'S", "'s"), ("'T", "'t"), ("'Re", "'re"), ("'Ll", "'ll"), ("'Ve", "'ve"), ("'M", "'m"), ("'D", "'d")]:
        s = s.replace(a, b)
    return s


def shortname(s):
    s = dedash(s or "").strip()
    s = re.sub(r"^top\s*pi?ck\s*", "", s, flags=re.I).strip()   # strip Temu "Top pick" badge
    s = re.sub(r"^\s*\[[^\]]*\]\s*", "", s)
    s = re.sub(r"^\d{3,4}\s+", "", s)
    s = re.split(r"[,.]", s)[0].strip()
    s = re.sub(r"\s+", " ", s)
    if len(s) > 55:
        cut = s[:55]; sp = cut.rfind(" ")
        s = (cut[:sp] if sp > 25 else cut).strip()
    return fixcaps(s).rstrip(" -,.|/&") or "Product"


def num(s):
    return float(re.sub(r"[^0-9.]", "", (s or "0")) or "0")


def price_pair(temu_cost):
    cost = round(temu_cost + max(10.0, temu_cost * 0.10), 2)     # member pays you
    return cost, round(cost * 2.5)                                # (cost_price, sell_price)


def esc(s):
    return (s or "").replace("'", "''")


def detect(keys):
    low = {k.lower(): k for k in keys}
    pick = lambda *opts: next((low[o] for o in opts if o in low), None)
    return {
        "title": pick("title", "product title", "product name", "name"),
        "price": pick("price", "price (zar)"),
        "image": pick("image_url", "image url"),
        "url": pick("product_url", "product url", "product link"),
        "pid": pick("product_id", "id"),
        "query": pick("source_query", "category/search term", "search query", "search_query"),
        "sizes": pick("size_variants", "sizes/variants"),
        "colors": pick("color_variants", "colors/variants"),
    }


def split_variant_values(raw):
    raw = dedash(raw or "").strip()
    if not raw or raw.upper() in ("N/A", "NA", "NONE", "-"):
        return []
    parts = re.split(r"\s*(?:,|;|\|)\s*", raw.replace(" and ", ", "))
    out = []
    for p in parts:
        p = p.strip().strip(".")
        if p and p.upper() not in ("N/A", "NA", "NONE", "-") and p not in out:
            out.append(p)
    return out


def variant_options_from(row, col):
    options = []
    colors = split_variant_values(row.get(col["colors"]) if col["colors"] else "")
    sizes = split_variant_values(row.get(col["sizes"]) if col["sizes"] else "")
    if colors and len(colors) > 1:
        options.append({"name": "Color", "values": colors[:40]})
    if sizes and len(sizes) > 1:
        options.append({"name": "Size / Age", "values": sizes[:40]})
    return options[:3]


def variant_display(options):
    chunks = []
    for opt in options or []:
        values = opt.get("values") or []
        if values:
            chunks.append(f"{opt.get('name', 'Option')}: {', '.join(values)}")
    return "; ".join(chunks)


APPAREL_RE = re.compile(
    r"\b(rompers?|bodysuits?|jumpsuits?|onesies?|outfits?|clothing|clothes|"
    r"sweaters?|sweatshirts?|pants set|dresses?|shirts?|shorts?|jackets?|vests?|"
    r"tracksuits?|overalls)\b",
    re.I,
)

KNOWN_COLORS = [
    "Black", "White", "Cream", "Beige", "Khaki", "Brown", "Coffee", "Grey",
    "Gray", "Green", "Blue", "Navy", "Pink", "Red", "Yellow", "Orange",
    "Purple", "Coral", "Gold", "Silver",
]


def requires_variant_options(name, category, full):
    """Return true when the listing is apparel that needs a fit choice."""
    return bool(APPAREL_RE.search(f"{name} {category} {full}"))


def inferred_apparel_options(text):
    """Supply usable age bands when Temu blocks the detail-page variant pass."""
    body = dedash(text or "")
    if re.search(r"\b(?:maternity|women|women's)\b", body, re.I):
        sizes = ["S", "M", "L", "XL"]
    elif re.search(r"0\s*-\s*18\s*(?:m|months?)\b", body, re.I):
        sizes = ["0-3M", "3-6M", "6-9M", "9-12M", "12-18M"]
    elif re.search(r"0\s*-\s*12\s*(?:m|months?)\b", body, re.I):
        sizes = ["0-3M", "3-6M", "6-9M", "9-12M"]
    elif re.search(r"0\s*-\s*9\s*(?:m|months?)\b", body, re.I):
        sizes = ["0-3M", "3-6M", "6-9M"]
    elif re.search(r"\b(?:toddler|0\s*-\s*3\s*(?:y|years?))\b", body, re.I):
        sizes = ["1-2Y", "2-3Y", "3-4Y"]
    elif re.search(r"\b(?:newborn|infant|baby)\b", body, re.I):
        sizes = ["Newborn", "0-3M", "3-6M", "6-9M", "9-12M"]
    else:
        sizes = ["2-3Y", "3-4Y", "4-5Y", "5-6Y"]

    options = [{"name": "Size / Age", "values": sizes}]
    colors = [c for c in KNOWN_COLORS if re.search(rf"\b{re.escape(c)}\b", body, re.I)]
    # Gray and Grey are spelling variants, not separate customer choices.
    if "Gray" in colors and "Grey" in colors:
        colors.remove("Gray")
    if len(colors) > 1:
        options.append({"name": "Color", "values": colors})
    return options

# ───────────────────────── stages ─────────────────────────

def stage_normalize(csv_path, category):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))
    if not rows:
        raise SystemExit("empty CSV")
    col = detect(rows[0].keys())
    if not (col["title"] and col["price"] and col["image"]):
        raise SystemExit(f"could not detect title/price/image columns in: {list(rows[0].keys())}")

    # existing source ids + names in the DB, to skip duplicates across scrapes
    res = mgmt_query("select coalesce(source_id,'') sid, lower(name) nm from public.products")
    payload = res if isinstance(res, list) else res.get("result", res)
    seen_ids = {r["sid"] for r in payload if r.get("sid")}
    seen_names = {r["nm"] for r in payload if r.get("nm")}

    out, seen_img = [], set()
    skipped_price = skipped_dup = 0
    for r in rows:
        p = (r.get(col["price"]) or "").strip()
        if not re.search(r"[0-9]", p) or p.upper() in ("N/A", "NA", "NONE", "-"):
            skipped_price += 1; continue
        img = (r.get(col["image"]) or "").strip()
        pid = (r.get(col["pid"]) or "").strip() if col["pid"] else ""
        name = shortname(r.get(col["title"]))
        if not img or img in seen_img or (pid and pid in seen_ids) or name.lower() in seen_names:
            skipped_dup += 1; continue
        seen_img.add(img)
        if pid:
            seen_ids.add(pid)
        seen_names.add(name.lower())
        variant_options = variant_options_from(r, col)
        full = fixcaps(dedash((r.get(col["title"]) or "").strip()))
        if requires_variant_options(name, category, full) and not variant_options:
            variant_options = inferred_apparel_options(full)
        out.append({
            "name": name,
            "full": full,
            "temu_cost": num(p), "image_url": img,
            "product_url": (r.get(col["url"]) or "").strip() if col["url"] else "",
            "variants": variant_display(variant_options), "variant_options": variant_options, "category": category,
            "source_id": pid,
            "source_query": (r.get(col["query"]) or "").strip() if col["query"] else category,
        })
    json.dump(out, open(QUEUE, "w"))
    print(f"normalize: {len(out)} new products | skipped {skipped_price} no-price, {skipped_dup} duplicates")
    print(f"  -> {QUEUE}  (review images before create; see README montage command)")


def _req(method, path, body, tok):
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(API + path, data=data, method=method,
                               headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    for _ in range(6):
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(float(e.headers.get("Retry-After", 2)) + 0.5); continue
            raise
    raise RuntimeError("too many Shopify retries: " + path)


def stage_create():
    rows = json.load(open(QUEUE))
    tok = shopify_token()
    ckpt = json.load(open(CKPT)) if os.path.exists(CKPT) else {}
    made = 0
    for i, r in enumerate(rows):
        k = str(i)
        if k in ckpt:
            continue
        cost, _ = price_pair(r["temu_cost"])
        options = r.get("variant_options") or []
        option_names = [o["name"] for o in options]
        combos = [dict(zip(option_names, vals)) for vals in itertools.product(*[o["values"] for o in options])] if options else [{}]
        if len(combos) > 100:
            print(f"  warning: {r['name'][:40]} has {len(combos)} combinations; capped to Shopify's first 100")
            combos = combos[:100]
        desc = r["full"] + (f" Options: {variant_display(options)}." if options else "")
        variants = []
        for combo in combos:
            variant = {"price": f"{cost:.2f}", "inventory_management": None,
                       "inventory_policy": "continue", "requires_shipping": True}
            for pos, opt in enumerate(options, start=1):
                variant[f"option{pos}"] = combo.get(opt["name"])
            variants.append(variant)
        payload = {"product": {
            "title": r["name"], "body_html": f"<p>{desc}</p>", "product_type": r["category"],
            "tags": ["supplier-hub", r["category"]], "status": "active",
            "images": [{"src": r["image_url"]}],
            "variants": variants,
        }}
        if options:
            payload["product"]["options"] = [{"name": o["name"], "values": o["values"]} for o in options]
        p = _req("POST", "/products.json", payload, tok)["product"]
        variant_map = []
        for v in p.get("variants", []):
            selected = {}
            for pos, opt in enumerate(options, start=1):
                val = v.get(f"option{pos}")
                if val:
                    selected[opt["name"]] = val
            if selected:
                variant_map.append({
                    "variant_id": str(v["id"]),
                    "checkout_url": f"https://{STORE}/cart/{v['id']}:1",
                    "options": selected,
                })
        ckpt[k] = {"id": p["id"], "handle": p["handle"], "variant_id": p["variants"][0]["id"],
                   "url": f"https://{STORE}/products/{p['handle']}", "variant_map": variant_map}
        json.dump(ckpt, open(CKPT, "w"))
        made += 1
        if made % 25 == 0:
            print(f"  created {made} (last: {r['name'][:40]})")
        time.sleep(0.55)                                  # ~1.8/s, under Shopify's 2/s
    print(f"create: {made} new, {len(ckpt)} total in checkpoint")


def stage_enrich():
    tok = shopify_token()
    ckpt = json.load(open(CKPT))
    by_id = {str(v["id"]): k for k, v in ckpt.items()}
    url = f"{API}/products.json?limit=250&fields=id,images"
    found = 0
    while url:
        r = urllib.request.Request(url, headers={"X-Shopify-Access-Token": tok})
        with urllib.request.urlopen(r, timeout=30) as resp:
            body = resp.read(); link = resp.headers.get("Link", "")
        for p in json.loads(body).get("products", []):
            k = by_id.get(str(p["id"]))
            if k and p.get("images"):
                ckpt[k]["image"] = p["images"][0]["src"]; found += 1
        json.dump(ckpt, open(CKPT, "w"))
        nxt = ""
        for part in link.split(","):
            if 'rel="next"' in part:
                nxt = part[part.find("<") + 1:part.find(">")]
        url = nxt; time.sleep(0.4)
    print(f"enrich: {found} products now on Shopify CDN")


def stage_load():
    rows = json.load(open(QUEUE))
    ckpt = json.load(open(CKPT))
    vals = []
    for i, r in enumerate(rows):
        k = str(i)
        if k not in ckpt:
            continue
        c = ckpt[k]
        cost, sell = price_pair(r["temu_cost"])
        options = r.get("variant_options") or []
        desc = esc(r["full"] + (f" Options: {variant_display(options)}." if options else ""))
        img = esc(dedash((c.get("image") or r["image_url"]).strip()))
        checkout = f"https://{STORE}/cart/{c['variant_id']}:1"
        variant_options = esc(json.dumps(options))
        variant_map = esc(json.dumps(c.get("variant_map") or []))
        vals.append("('%s','%s',%.2f,%.2f,'%s','%s','%s','%s','%s','%s'::jsonb,'%s'::jsonb,'in_stock',true)" % (
            esc(r["name"]), esc(r["category"]), cost, sell, img, desc,
            esc(c["url"]), checkout, esc(r.get("source_id") or ""), variant_options, variant_map))
    if not vals:
        print("load: nothing to insert"); return
    sql = ("insert into public.products (name,category,cost_price,sell_price,image_url,"
           "description,shopify_url,checkout_url,source_id,variant_options,variant_map,stock_status,active) values\n"
           + ",\n".join(vals) + ";")
    mgmt_query(sql)
    print(f"load: inserted {len(vals)} products into the hub")
    tot = mgmt_query("select count(*) n from public.products where active")
    tot = tot if isinstance(tot, list) else tot.get("result", tot)
    print(f"  catalogue now: {tot[0]['n']} active products")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["normalize", "create", "enrich", "load", "all"])
    ap.add_argument("--csv")
    ap.add_argument("--category")
    a = ap.parse_args()
    if a.stage in ("normalize", "all"):
        if not (a.csv and a.category):
            raise SystemExit("normalize/all need --csv and --category")
        stage_normalize(a.csv, a.category)
    if a.stage in ("create", "all"):
        stage_create()
    if a.stage in ("enrich", "all"):
        stage_enrich()
    if a.stage in ("load", "all"):
        stage_load()


if __name__ == "__main__":
    main()
