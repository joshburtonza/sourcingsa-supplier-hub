#!/opt/homebrew/bin/python3
"""
Auto-grant ZA Supplier Hub access to every Growth + Elite DropStore member.

Growth and Elite course packages BUNDLE hub access (they don't buy the separate
R99), so they don't land in the hub paywall on their own. This job reads the
package tiers from the DropStore DB and provisions any missing member into the
hub: paid_customers + register_paid_user (account + 'approved' role) + a profile
row carrying their dropstore_tier and the must-change-password flag.

Idempotent — existing members are no-ops (register_paid_user returns 'exists'),
and we never re-flag must_change_password for someone who already set their own.

Runs hourly via LaunchAgent com.amalfi.zahub-package-sync.
Starters are intentionally excluded (Josh, 2026-06-07).

Creds: Supabase management-API token from macOS keychain ("Supabase CLI").
"""
import base64
import datetime
import json
import os
import subprocess
import urllib.request

ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")

DROPSTORE = "xxvnsztpujtsedybuyfu"   # DropStore course DB (package tiers)
HUB = "vcvvkpzgcscwvmzmdpye"          # ZA Supplier Hub DB
TEMP_PW = "ZASupplyHub25!"


def _token():
    # Supabase personal access token (sbp_...). Prefer .env (stable), fall back
    # to the Supabase CLI keychain entry (which may be base64-wrapped).
    try:
        for line in open(ENV_FILE, encoding="utf-8"):
            if line.startswith("SUPABASE_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    raw = subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).strip()
    try:
        return base64.b64decode(raw).decode().strip()
    except Exception:
        return raw.decode().strip()


def q(ref, sql):
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/%s/database/query" % ref,
        data=json.dumps({"query": sql}).encode(),
        method="POST",
        headers={
            "Authorization": "Bearer " + _token(),
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",   # python UA is Cloudflare-blocked (403)
        },
    )
    with urllib.request.urlopen(req, timeout=90) as x:
        body = json.loads(x.read())
    return body if isinstance(body, list) else body.get("result", body)


def log(msg):
    print("%s  %s" % (datetime.datetime.now().isoformat(timespec="seconds"), msg), flush=True)


def main():
    # 1) Growth + Elite roster from DropStore (orders + tier upgrades; highest tier wins).
    roster = q(DROPSTORE, """
      with tiers as (
        select lower(email) email,
               max(case package_tier when 'elite' then 3 when 'growth' then 2 else 0 end) rank
        from public.dropstore_shopify_orders
        where email is not null and email <> '' group by lower(email)
        union all
        select lower(member_email),
               max(case to_tier when 'elite' then 3 when 'growth' then 2 else 0 end)
        from public.dropstore_tier_upgrades where member_email is not null group by lower(member_email)
      )
      select email, case max(rank) when 3 then 'elite' else 'growth' end tier
      from tiers group by email having max(rank) >= 2;
    """)
    if not roster:
        log("no growth/elite members found; nothing to do")
        return

    def esc(s):
        return s.replace("'", "''")

    vals = ",".join("('%s','%s')" % (esc(r["email"]), r["tier"]) for r in roster)

    # 2) Provision missing members in the hub. New accounts get must_change_password=true;
    #    existing members only have their tier kept in sync (never re-flagged).
    sql = """
    do $$
    declare rec record; res jsonb;
    begin
      for rec in select email, tier from (values %s) as t(email, tier) loop
        insert into public.paid_customers (email, amount, currency, paid_at)
        values (lower(rec.email), case rec.tier when 'elite' then 999 else 449 end, 'ZAR', now())
        on conflict (email) do nothing;
        res := public.register_paid_user(rec.email, '%s');
        if coalesce((res->>'ok')::boolean, false) then
          insert into public.profiles (id, email, must_change_password, dropstore_tier)
          select id, lower(rec.email), true, rec.tier from auth.users where lower(email) = lower(rec.email)
          on conflict (id) do update set must_change_password = true, dropstore_tier = excluded.dropstore_tier;
        else
          update public.profiles set dropstore_tier = rec.tier where lower(email) = lower(rec.email);
        end if;
      end loop;
    end $$;
    select
      (select count(*) from public.profiles where dropstore_tier in ('elite','growth')) hub_growth_elite,
      %s roster_size;
    """ % (vals, TEMP_PW, len(roster))

    out = q(HUB, sql)
    log("roster=%d  hub_growth_elite=%s" % (len(roster), out[0]["hub_growth_elite"] if out else "?"))

    # 3) Catch-all: provision ANY entitled member (in paid_customers) with no account yet
    #    — e.g. R99 direct payers added by the orders/paid webhook who never self-signed-up.
    gap = q(HUB, """
    do $$
    declare rec record; res jsonb;
    begin
      for rec in
        select email from public.paid_customers pc
        where not exists (select 1 from auth.users u where lower(u.email) = lower(pc.email))
      loop
        res := public.register_paid_user(rec.email, '%s');
        if coalesce((res->>'ok')::boolean, false) then
          insert into public.profiles (id, email, must_change_password)
          select id, lower(rec.email), true from auth.users where lower(email) = lower(rec.email)
          on conflict (id) do update set must_change_password = true;
        end if;
      end loop;
    end $$;
    select count(*) remaining from public.paid_customers pc
    where not exists (select 1 from auth.users u where lower(u.email) = lower(pc.email));
    """ % TEMP_PW)
    log("paid-without-account remaining after sync: %s" % (gap[0]["remaining"] if gap else "?"))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001 — log and exit non-zero so failures surface
        log("ERROR: %r" % e)
        raise
