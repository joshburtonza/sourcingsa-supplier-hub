-- ZA Supplier Hub, payment-gated signup
-- Flow: Get Access -> Shopify R99 checkout -> (payment) -> /signup ->
--       register_paid_user() verifies the email paid, THEN creates the
--       account + grants `approved`. No payment = no account.
--
-- Public GoTrue signup stays DISABLED. The ONLY way an account is created
-- is this function, and it is gated on public.paid_customers. paid_customers
-- is written only by the Shopify orders/paid webhook (service role) or an
-- admin backfill, never by the client.
--
-- Idempotent + safe to re-run.

-- ─────────────── Entitlement list: who has paid ───────────────
create table if not exists public.paid_customers (
  email            text primary key,
  shopify_order_id text,
  amount           numeric(10,2),
  currency         text,
  paid_at          timestamptz not null default now(),
  consumed_at      timestamptz            -- set when they finish signing up
);
alter table public.paid_customers enable row level security;
-- No policies on purpose: anon/authenticated are fully blocked. Only the
-- service-role webhook (RLS-bypassing) and SECURITY DEFINER functions touch it.

-- ─────────────── Gated account creation ───────────────
-- SECURITY DEFINER so it can write auth.users; the gate (paid_customers
-- membership) is enforced INSIDE the function, so exposing it to anon is safe:
-- a caller can only create an account for an email that has actually paid.
create or replace function public.register_paid_user(
  p_email     text,
  p_password  text,
  p_full_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid   uuid;
begin
  if v_email = '' or p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  -- Payment gate.
  if not exists (select 1 from public.paid_customers where lower(email) = v_email) then
    return jsonb_build_object('ok', false, 'error', 'no_payment');
  end if;

  -- Already has an account.
  if exists (select 1 from auth.users where lower(email) = v_email) then
    return jsonb_build_object('ok', false, 'error', 'exists');
  end if;

  -- Create the confirmed auth user (mirrors the validated manual pattern).
  v_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', nullif(trim(coalesce(p_full_name, '')), '')),
    '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid::text, v_uid,
          jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  -- Grant access. (handle_new_user trigger already created the profile.)
  insert into public.user_roles (user_id, role) values (v_uid, 'approved'::public.app_role)
    on conflict do nothing;

  update public.paid_customers set consumed_at = now() where lower(email) = v_email;

  return jsonb_build_object('ok', true);
end $$;

-- Locked down: callable by the anon client (the gate is internal), nobody else.
revoke execute on function public.register_paid_user(text, text, text) from public;
grant execute on function public.register_paid_user(text, text, text) to anon, authenticated;
