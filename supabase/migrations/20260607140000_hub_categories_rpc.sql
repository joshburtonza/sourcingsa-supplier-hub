-- Distinct active categories for the browse dropdown. Needed because the browse
-- SELECT is capped at 1000 rows (db_max_rows) and the catalogue is now ~5,700,
-- so the dropdown can no longer be derived from the product fetch. SECURITY
-- DEFINER so it sees all categories regardless of the caller's row visibility.
create or replace function public.hub_categories()
returns table(category text)
language sql stable security definer
set search_path = public
as $$
  select category from public.products
  where active and category is not null
  group by category
  order by category;
$$;
grant execute on function public.hub_categories() to authenticated, anon;
