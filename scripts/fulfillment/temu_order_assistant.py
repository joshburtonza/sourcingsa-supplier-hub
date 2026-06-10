#!/usr/bin/env python3
"""
Assisted Temu fulfillment for ZA Supplier Hub orders.

This script prepares an operator pack for paid hub orders. It intentionally stops
before checkout/payment: Temu can change price, stock, shipping, and variants, so
the operator must review the cart and pay manually.
"""
import argparse
import base64
import html
import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.path.join(HERE, ".work")
os.makedirs(WORK, exist_ok=True)
ENV_FILE = os.path.join(ROOT, ".env")

PROJECT_REF = "vcvvkpzgcscwvmzmdpye"
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"


def mgmt_token():
    try:
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                if line.startswith("SUPABASE_ACCESS_TOKEN="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    raw = subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"],
    ).strip()
    try:
        return base64.b64decode(raw).decode().strip()
    except Exception:
        return raw.decode().strip()


def mgmt_query(sql):
    req = urllib.request.Request(
        MGMT_URL,
        data=json.dumps({"query": sql}).encode(),
        method="POST",
        headers={
            "Authorization": "Bearer " + mgmt_token(),
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read())
    return payload if isinstance(payload, list) else payload.get("result", payload)


def esc(value):
    return str(value or "").replace("'", "''")


def temu_url(source_id):
    if not source_id:
        return ""
    # Temu accepts a slug before -g-{id}.html; a neutral slug keeps the URL
    # deterministic even when the original scrape URL was not stored.
    return f"https://www.temu.com/za/source-product-g-{source_id}.html"


def clean_filename(value):
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(value or "").strip())
    return value.strip("-")[:80] or "order"


def order_filter(args):
    clauses = ["o.paid is true"]
    if args.status:
        clauses.append(f"o.status = '{esc(args.status)}'")
    if args.order_id:
        clauses.append(f"o.id = '{esc(args.order_id)}'")
    if args.shopify_order_id:
        clauses.append(f"o.shopify_order_id = '{esc(args.shopify_order_id)}'")
    return " and ".join(clauses)


def fetch_orders(args):
    sql = f"""
    select
      o.id,
      o.email,
      o.product_name,
      o.quantity,
      o.unit_cost,
      o.amount,
      o.status,
      o.paid,
      o.variant_selection,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.shipping_address,
      o.shipping_city,
      o.shipping_province,
      o.shipping_postal_code,
      o.notes,
      o.shopify_order_id,
      o.ordered_at,
      coalesce(p.id, p2.id) as product_id,
      coalesce(p.name, p2.name) as hub_product_name,
      coalesce(p.category, p2.category) as category,
      coalesce(p.source_id, p2.source_id) as source_id,
      coalesce(p.source_query, p2.source_query) as source_query,
      coalesce(p.cost_price, p2.cost_price) as expected_cost_price,
      coalesce(p.variant_options, p2.variant_options) as variant_options,
      coalesce(p.variant_map, p2.variant_map) as variant_map
    from public.orders o
    left join public.products p on p.id = o.product_id
    left join public.products p2 on lower(p2.name) = lower(o.product_name)
    where {order_filter(args)}
    order by o.ordered_at desc nulls last, o.id desc
    limit {int(args.limit)}
    """
    return mgmt_query(sql)


def source_id_coverage():
    rows = mgmt_query("""
    select count(*) total,
           count(*) filter (where source_id is not null and source_id <> '') with_source
    from public.products
    where active is true
    """)
    if not rows:
        return {"total": 0, "with_source": 0}
    return rows[0]


def variant_text(value):
    if not value:
        return ""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            return value
    if isinstance(value, dict):
        return ", ".join(f"{k}: {v}" for k, v in value.items())
    return json.dumps(value, ensure_ascii=False)


def build_record(row):
    source_id = row.get("source_id")
    issues = []
    if not source_id:
        issues.append("missing Temu source_id; cannot produce source product URL")
    if not row.get("shipping_address"):
        issues.append("missing shipping_address")
    if not row.get("shipping_city"):
        issues.append("missing shipping_city")
    if row.get("hub_product_name") and row["hub_product_name"] != row["product_name"]:
        issues.append("order title matched a different hub product name; review carefully")
    return {
        "order_id": row.get("id"),
        "shopify_order_id": row.get("shopify_order_id"),
        "member_email": row.get("email"),
        "status": row.get("status"),
        "product_name": row.get("product_name"),
        "hub_product_name": row.get("hub_product_name"),
        "category": row.get("category"),
        "quantity": row.get("quantity") or 1,
        "unit_cost": row.get("unit_cost"),
        "amount": row.get("amount"),
        "expected_cost_price": row.get("expected_cost_price"),
        "variant_selection": row.get("variant_selection") or {},
        "variant_selection_label": variant_text(row.get("variant_selection")),
        "source_id": source_id,
        "source_query": row.get("source_query"),
        "temu_url": temu_url(source_id),
        "customer": {
            "name": row.get("customer_name"),
            "email": row.get("customer_email"),
            "phone": row.get("customer_phone"),
            "address": row.get("shipping_address"),
            "city": row.get("shipping_city"),
            "province": row.get("shipping_province"),
            "postal_code": row.get("shipping_postal_code"),
        },
        "notes": row.get("notes"),
        "issues": issues,
        "action": "Open Temu URL, select matching variant, add quantity, enter customer address, stop before payment.",
    }


def write_outputs(records, label):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base = os.path.join(WORK, f"temu-fulfillment-{stamp}-{clean_filename(label)}")
    json_path = base + ".json"
    html_path = base + ".html"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(render_html(records))
    return json_path, html_path


def render_html(records):
    cards = []
    for r in records:
        customer = r["customer"]
        issues = "".join(f"<li>{html.escape(i)}</li>" for i in r["issues"]) or "<li>None</li>"
        temu_link = (
            f'<a href="{html.escape(r["temu_url"])}" target="_blank" rel="noreferrer">Open Temu product</a>'
            if r["temu_url"]
            else "<span class='muted'>No Temu URL available</span>"
        )
        cards.append(f"""
        <section class="card">
          <h2>{html.escape(r["product_name"] or "Order")}</h2>
          <p class="muted">Order {html.escape(str(r["order_id"]))} · Shopify {html.escape(str(r["shopify_order_id"] or ""))}</p>
          <div class="grid">
            <div><strong>Temu</strong><br>{temu_link}<br><span class="muted">source_id: {html.escape(str(r["source_id"] or ""))}</span></div>
            <div><strong>Qty</strong><br>{html.escape(str(r["quantity"]))}</div>
            <div><strong>Variant</strong><br>{html.escape(r["variant_selection_label"] or "-")}</div>
            <div><strong>Expected cost</strong><br>{html.escape(str(r["expected_cost_price"] or r["unit_cost"] or ""))}</div>
          </div>
          <h3>Ship to</h3>
          <p>
            {html.escape(str(customer.get("name") or ""))}<br>
            {html.escape(str(customer.get("address") or ""))}<br>
            {html.escape(", ".join(str(x) for x in [customer.get("city"), customer.get("province"), customer.get("postal_code")] if x))}<br>
            {html.escape(str(customer.get("phone") or ""))}<br>
            {html.escape(str(customer.get("email") or ""))}
          </p>
          <h3>Review issues</h3>
          <ul>{issues}</ul>
        </section>
        """)
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Temu fulfillment pack</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #111; background: #f6f7f8; }}
    h1 {{ margin-bottom: 8px; }}
    .muted {{ color: #667085; }}
    .card {{ background: white; border: 1px solid #d0d5dd; border-radius: 10px; padding: 20px; margin: 18px 0; }}
    .grid {{ display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 14px; margin: 18px 0; }}
    a {{ color: #0b5fff; font-weight: 600; }}
    li {{ margin: 4px 0; }}
  </style>
</head>
<body>
  <h1>Temu fulfillment pack</h1>
  <p class="muted">Review manually. Do not pay until Temu product, variant, address, shipping, and price are confirmed.</p>
  {''.join(cards)}
</body>
</html>
"""


def open_links(records, html_path):
    subprocess.run(["open", html_path], check=False)
    for r in records:
        if r["temu_url"]:
            subprocess.run(["open", r["temu_url"]], check=False)


def main():
    parser = argparse.ArgumentParser(description="Prepare Temu fulfillment handoff for paid hub orders.")
    parser.add_argument("--order-id", help="Hub orders.id to prepare")
    parser.add_argument("--shopify-order-id", help="Shopify order id to prepare")
    parser.add_argument("--status", default="processing", help="Order status filter, default: processing. Use '' for any paid status.")
    parser.add_argument("--limit", type=int, default=1, help="Number of paid orders to include")
    parser.add_argument("--check-source-coverage", action="store_true", help="Report how many active products can be traced back to Temu source_id")
    parser.add_argument("--open", action="store_true", help="Open the generated HTML pack and Temu product links in the default browser")
    args = parser.parse_args()

    if args.check_source_coverage:
        cov = source_id_coverage()
        total = int(cov.get("total") or 0)
        with_source = int(cov.get("with_source") or 0)
        pct = (with_source / total * 100) if total else 0
        print(f"active products: {total}")
        print(f"with Temu source_id: {with_source} ({pct:.1f}%)")
        if with_source == 0:
            print("warning: fulfillment cannot produce Temu source URLs until catalogue loads preserve source_id")
        return 0 if with_source else 2

    if args.status == "":
        args.status = None
    rows = fetch_orders(args)
    if not rows:
        print("No matching paid orders found.")
        return 1

    records = [build_record(r) for r in rows]
    label = args.order_id or args.shopify_order_id or "latest"
    json_path, html_path = write_outputs(records, label)
    blockers = sum(1 for r in records if r["issues"])
    print(f"prepared: {len(records)} order line(s)")
    print(f"blockers: {blockers}")
    print(f"json: {json_path}")
    print(f"html: {html_path}")
    for r in records:
        print(f"- {r['product_name']} | qty {r['quantity']} | Temu: {r['temu_url'] or 'MISSING'}")
        for issue in r["issues"]:
            print(f"  warning: {issue}")
    if args.open:
        open_links(records, html_path)
    return 0 if blockers == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
