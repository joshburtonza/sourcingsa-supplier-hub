-- Let a member read their OWN membership row so the dashboard can show
-- "Membership Active - R99 paid <date>". Isolated by email = auth.email();
-- no member can see another's paid_customers row. Admins/service-role unaffected.
drop policy if exists "Users view own paid record" on public.paid_customers;
create policy "Users view own paid record" on public.paid_customers
  for select to authenticated
  using (lower(email) = lower(auth.email()));
