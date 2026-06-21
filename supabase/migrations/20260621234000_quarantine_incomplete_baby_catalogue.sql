-- Quarantine catalogue rows that cannot be ordered safely.
-- The June 7 queue load included duplicate full-size strollers priced as if
-- they cost R1-R5 on Temu, and clothing whose detail-page variant scrape was
-- explicitly blocked by Temu verification. Correctly priced stroller rows
-- remain active; incomplete apparel stays retained for later backfill.

BEGIN;

UPDATE public.products
SET active = false
WHERE active
  AND category = 'Baby & Mom'
  AND cost_price < 100
  AND (name ILIKE '%stroller%' OR name ILIKE '%pram%')
  AND NOT (name ILIKE ANY (ARRAY[
    '%hook%', '%holder%', '%bag%', '%toy%', '%bib%', '%cover%',
    '%blanket%', '%fan%', '%accessor%'
  ]));

UPDATE public.products
SET active = false
WHERE active
  AND category = 'Baby & Mom'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
  AND (name || ' ' || coalesce(description, '')) ~*
    '\m(romper|bodysuit|jumpsuit|onesie|outfit|clothing|clothes|sweater|pants set|dress|shirt|jacket|vest|tracksuit|overalls)\M';

COMMIT;
