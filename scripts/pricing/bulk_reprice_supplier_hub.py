#!/usr/bin/env python3
"""
Bulk reprice ZA Supplier Hub products from the old catalogue formula to a
100% markup on the inferred Temu scrape price.

Old formula:
    cost_price = Temu price + max(R10, 10%)

New formula:
    cost_price = max(current cost_price, Temu price * 2)
    sell_price = round(cost_price * 2.5)

By default this is a dry run and skips obvious scrape-price anomalies such as
car-vacuum PA/year text that was captured as the price.
"""
from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import subprocess
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any


PROJECT_REF = "vcvvkpzgcscwvmzmdpye"
MGMT_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
STORE = "byjbdf-2k.myshopify.com"
SHOPIFY_API = f"https://{STORE}/admin/api/2024-10"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILE = ROOT / ".env"
WORK_DIR = Path(__file__).resolve().parent / ".work"
WORK_DIR.mkdir(parents=True, exist_ok=True)
TOK_FILE = WORK_DIR / "shopify_tok"
DROPSITE_ENV_FILE = Path.home() / ".openclaw/secrets/dropsite.env"


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rand_int(value: Decimal) -> Decimal:
    return value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def esc(value: Any) -> str:
    return str(value or "").replace("'", "''")


def mgmt_token() -> str:
    raw = subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"],
    ).strip()
    try:
        return base64.b64decode(raw).decode().strip()
    except Exception:
        return raw.decode().strip()


def mgmt_query(sql: str) -> list[dict[str, Any]]:
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
    with urllib.request.urlopen(req, timeout=180) as resp:
        payload = json.loads(resp.read())
    return payload if isinstance(payload, list) else payload.get("result", payload)


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip("\"'")
    for key in ("SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET", "SHOPIFY_STORE"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def shopify_token(env: dict[str, str]) -> str:
    if env.get("SHOPIFY_ACCESS_TOKEN"):
        return env["SHOPIFY_ACCESS_TOKEN"]

    if TOK_FILE.exists():
        token = TOK_FILE.read_text(encoding="utf-8").strip()
        try:
            req = urllib.request.Request(
                SHOPIFY_API + "/shop.json",
                headers={"X-Shopify-Access-Token": token},
            )
            urllib.request.urlopen(req, timeout=20)
            return token
        except urllib.error.HTTPError:
            pass

    client_id = env.get("SHOPIFY_CLIENT_ID")
    client_secret = env.get("SHOPIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET not found")

    data = json.dumps(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        },
    ).encode()
    req = urllib.request.Request(
        f"https://{STORE}/admin/oauth/access_token",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    token = json.loads(urllib.request.urlopen(req, timeout=30).read())["access_token"]
    TOK_FILE.write_text(token, encoding="utf-8")
    return token


def dropsite_shopify_token(store_url: str = f"https://{STORE}") -> str:
    env = load_env(DROPSITE_ENV_FILE)
    sb_url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not key:
        raise RuntimeError(f"DropStore Supabase credentials not found in {DROPSITE_ENV_FILE}")

    query = (
        "provider=eq.shopify"
        "&select=id,access_token,metadata"
        "&metadata->>storeUrl=eq."
        + urllib.parse.quote(store_url, safe="")
    )
    req = urllib.request.Request(
        f"{sb_url}/rest/v1/business_connections?{query}",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Accept": "application/json",
            "Accept-Profile": "dropsite",
        },
    )
    rows = json.loads(urllib.request.urlopen(req, timeout=30).read())
    if not rows:
        raise RuntimeError(f"No DropStore Shopify connection found for {store_url}")
    row = rows[0]
    metadata = row.get("metadata") or {}
    token = row.get("access_token")
    expires_at = metadata.get("tokenExpiresAt")
    expires_ms = 0
    if expires_at:
        try:
            # Good enough for ISO strings ending in Z; avoids adding dateutil.
            expires_ms = time.mktime(time.strptime(expires_at[:19], "%Y-%m-%dT%H:%M:%S")) * 1000
        except Exception:
            expires_ms = 0
    if token and (not metadata.get("clientId") or expires_ms - 10 * 60_000 > time.time() * 1000):
        return token

    client_id = metadata.get("clientId")
    client_secret = metadata.get("clientSecret")
    if not client_id or not client_secret:
        if token:
            return token
        raise RuntimeError(f"DropStore Shopify connection for {store_url} has no usable token or client credentials")

    data = urllib.parse.urlencode(
        {"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
    ).encode()
    req = urllib.request.Request(
        f"{store_url}/admin/oauth/access_token",
        data=data,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    minted = json.loads(urllib.request.urlopen(req, timeout=30).read())
    token = minted.get("access_token")
    if not token:
        raise RuntimeError("Shopify token exchange returned no access_token")
    token_expires_at = time.strftime(
        "%Y-%m-%dT%H:%M:%SZ",
        time.gmtime(time.time() + int(minted.get("expires_in") or 86399)),
    )
    new_metadata = {**metadata, "tokenExpiresAt": token_expires_at}
    patch = urllib.request.Request(
        f"{sb_url}/rest/v1/business_connections?id=eq.{urllib.parse.quote(row['id'])}",
        data=json.dumps({"access_token": token, "metadata": new_metadata}).encode(),
        method="PATCH",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Profile": "dropsite",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    urllib.request.urlopen(patch, timeout=30).read()
    return token


def shopify_put_variant(variant_id: str, price: Decimal, token: str) -> None:
    body = json.dumps({"variant": {"id": int(variant_id), "price": f"{price:.2f}"}}).encode()
    req = urllib.request.Request(
        f"{SHOPIFY_API}/variants/{variant_id}.json",
        data=body,
        method="PUT",
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
    )
    for attempt in range(5):
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            used, _, total = resp.headers.get("X-Shopify-Shop-Api-Call-Limit", "0/40").partition("/")
            if used.isdigit() and total.isdigit() and int(used) >= max(1, int(total) - 5):
                time.sleep(1.0)
            resp.read()
            return
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                TOK_FILE.unlink(missing_ok=True)
            if exc.code == 429 and attempt < 4:
                time.sleep(float(exc.headers.get("Retry-After") or 2))
                continue
            if 500 <= exc.code < 600 and attempt < 4:
                time.sleep(2 + attempt)
                continue
            raise


def fetch_products() -> list[dict[str, Any]]:
    return mgmt_query(
        """
        select
          id,
          name,
          category,
          cost_price,
          sell_price,
          checkout_url,
          variant_map
        from public.products
        where active is true
        order by category, name, id
        """,
    )


def infer_temu_price(cost_price: Decimal) -> Decimal:
    if cost_price <= Decimal("110"):
        return money(cost_price - Decimal("10"))
    return money(cost_price / Decimal("1.1"))


def variant_ids(row: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for url in [row.get("checkout_url")]:
        match = re.search(r"/cart/(\d+):", str(url or ""))
        if match:
            ids.append(match.group(1))

    variant_map = row.get("variant_map") or []
    if isinstance(variant_map, str):
        try:
            variant_map = json.loads(variant_map)
        except json.JSONDecodeError:
            variant_map = []
    if isinstance(variant_map, list):
        for item in variant_map:
            if isinstance(item, dict):
                raw_id = item.get("variant_id") or item.get("id")
                if raw_id:
                    ids.append(str(raw_id))
                match = re.search(r"/cart/(\d+):", str(item.get("checkout_url") or ""))
                if match:
                    ids.append(match.group(1))
    return sorted(set(ids))


def suspect_issue(row: dict[str, Any], inferred_temu: Decimal) -> str:
    name = str(row.get("name") or "")
    if inferred_temu >= Decimal("10000"):
        return "extreme inferred Temu price"
    if re.search(r"(160000PA|24000PA|26000PA|2026 Brushless)", name, re.I) and inferred_temu > Decimal("1000"):
        return "likely PA/year text parsed as price"
    return ""


def build_plan(rows: list[dict[str, Any]], include_suspect: bool) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for row in rows:
        current_cost = money(Decimal(str(row["cost_price"])))
        current_sell = money(Decimal(str(row["sell_price"])))
        inferred = infer_temu_price(current_cost)
        doubled = money(inferred * Decimal("2"))
        new_cost = max(current_cost, doubled)
        new_sell = rand_int(new_cost * Decimal("2.5"))
        issue = suspect_issue(row, inferred)
        skipped = bool(issue and not include_suspect)
        plan.append(
            {
                "id": row["id"],
                "name": row["name"],
                "category": row["category"],
                "old_cost_price": f"{current_cost:.2f}",
                "old_sell_price": f"{current_sell:.2f}",
                "inferred_temu_price": f"{inferred:.2f}",
                "new_cost_price": f"{new_cost:.2f}",
                "new_sell_price": f"{new_sell:.2f}",
                "variant_ids": ",".join(variant_ids(row)),
                "issue": issue,
                "skipped": "yes" if skipped else "no",
                "changed": "yes" if (new_cost != current_cost or new_sell != current_sell) and not skipped else "no",
            },
        )
    return plan


def write_csv(plan: list[dict[str, Any]], path: Path) -> None:
    fields = [
        "id",
        "name",
        "category",
        "old_cost_price",
        "old_sell_price",
        "inferred_temu_price",
        "new_cost_price",
        "new_sell_price",
        "variant_ids",
        "issue",
        "skipped",
        "changed",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(plan)


def apply_supabase(plan: list[dict[str, Any]]) -> int:
    rows = [row for row in plan if row["changed"] == "yes"]
    if not rows:
        return 0

    values = ",\n".join(
        "('%s'::uuid, %.2f::numeric, %.2f::numeric)"
        % (esc(row["id"]), Decimal(row["new_cost_price"]), Decimal(row["new_sell_price"]))
        for row in rows
    )
    sql = f"""
    update public.products as p
    set
      cost_price = v.cost_price,
      sell_price = v.sell_price,
      updated_at = now()
    from (values
    {values}
    ) as v(id, cost_price, sell_price)
    where p.id = v.id;
    """
    mgmt_query(sql)
    return len(rows)


class RateLimiter:
    def __init__(self, rate_per_second: float) -> None:
        self.interval = 1.0 / max(rate_per_second, 0.1)
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self) -> None:
        with self.lock:
            now = time.monotonic()
            if self.next_at > now:
                time.sleep(self.next_at - now)
                now = time.monotonic()
            self.next_at = max(now, self.next_at) + self.interval


def apply_shopify(
    plan: list[dict[str, Any]],
    token: str,
    pause_seconds: float,
    workers: int,
    rate_per_second: float,
) -> tuple[int, list[str]]:
    updated = 0
    failures: list[str] = []
    seen: set[str] = set()
    tasks: list[tuple[str, Decimal]] = []
    for row in plan:
        if row["changed"] != "yes":
            continue
        for variant_id in filter(None, row["variant_ids"].split(",")):
            if variant_id in seen:
                continue
            seen.add(variant_id)
            tasks.append((variant_id, Decimal(row["new_cost_price"])))

    limiter = RateLimiter(rate_per_second)

    def update_one(variant_id: str, price: Decimal) -> str:
        limiter.wait()
        shopify_put_variant(variant_id, price, token)
        if pause_seconds:
            time.sleep(pause_seconds)
        return variant_id

    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = {pool.submit(update_one, variant_id, price): variant_id for variant_id, price in tasks}
        for future in as_completed(futures):
            variant_id = futures[future]
            try:
                future.result()
                updated += 1
                if updated % 100 == 0:
                    print(f"shopify_progress={updated}/{len(tasks)}", flush=True)
            except Exception as exc:
                failures.append(f"{variant_id}: {exc}")
    return updated, failures


def summarize(plan: list[dict[str, Any]]) -> dict[str, Any]:
    changed = [row for row in plan if row["changed"] == "yes"]
    skipped = [row for row in plan if row["skipped"] == "yes"]
    return {
        "rows": len(plan),
        "changed": len(changed),
        "unchanged": len(plan) - len(changed) - len(skipped),
        "skipped": len(skipped),
        "old_cost_total": f"{sum(Decimal(row['old_cost_price']) for row in plan):.2f}",
        "new_cost_total": f"{sum(Decimal(row['new_cost_price']) for row in plan if row['skipped'] == 'no'):.2f}",
        "old_sell_total": f"{sum(Decimal(row['old_sell_price']) for row in plan):.2f}",
        "new_sell_total": f"{sum(Decimal(row['new_sell_price']) for row in plan if row['skipped'] == 'no'):.2f}",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-supabase", action="store_true")
    parser.add_argument("--apply-shopify", action="store_true")
    parser.add_argument("--include-suspect", action="store_true")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE))
    parser.add_argument("--output", default=str(WORK_DIR / "supplier-hub-reprice-dry-run.csv"))
    parser.add_argument("--pause-seconds", type=float, default=0.08)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--rate-per-second", type=float, default=2.0)
    parser.add_argument(
        "--shopify-token-source",
        choices=["env", "dropsite"],
        default="env",
        help="env reads SHOPIFY_ACCESS_TOKEN or SHOPIFY_CLIENT_ID/SECRET; dropsite reads the saved byjbdf-2k connection.",
    )
    args = parser.parse_args()

    plan = build_plan(fetch_products(), include_suspect=args.include_suspect)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    write_csv(plan, output)

    summary = summarize(plan)
    print(json.dumps({"dry_run_csv": str(output), **summary}, indent=2))

    if args.apply_shopify:
        try:
            token = (
                dropsite_shopify_token()
                if args.shopify_token_source == "dropsite"
                else shopify_token(load_env(Path(args.env_file)))
            )
        except RuntimeError as exc:
            raise SystemExit(f"Shopify update skipped: {exc}") from exc
        updated, failures = apply_shopify(plan, token, args.pause_seconds, args.workers, args.rate_per_second)
        print(f"shopify_variants_updated={updated}")
        if failures:
            failure_path = output.with_suffix(".shopify-failures.txt")
            failure_path.write_text("\n".join(failures), encoding="utf-8")
            print(f"shopify_failures={len(failures)} {failure_path}")
            if args.apply_supabase:
                raise SystemExit("Shopify had failures; Supabase update skipped to avoid price mismatch")

    if args.apply_supabase:
        print(f"supabase_updated={apply_supabase(plan)}")


if __name__ == "__main__":
    main()
