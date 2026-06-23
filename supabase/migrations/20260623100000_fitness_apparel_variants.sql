-- Backfill selectable sizes for adult fitness/apparel products. Dedicated
-- apparel categories are always included; the mixed Fitness category is
-- limited to clothing terms and excludes equipment-style vests/support gear.

BEGIN;

WITH targets AS (
  SELECT
    id,
    category,
    lower(name || ' ' || coalesce(description, '')) AS body
  FROM public.products
  WHERE active
    AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
    AND (
      category IN (
        'Curve Underwear',
        'Men''s Activewear',
        'Men''s Big & Tall',
        'Men''s Hoodies & Sweatshirts',
        'Men''s Underwear',
        'Women''s Activewear',
        'Women''s Athleisure',
        'Women''s Bras & Bralettes',
        'Women''s Dresses',
        'Women''s Jumpsuits',
        'Women''s Panties',
        'Women''s Shapewear',
        'Women''s Skinny-Fit Pants',
        'Women''s Sweatshirts'
      )
      OR (
        category = 'Fitness'
        AND (name || ' ' || coalesce(description, '')) ~*
          '(activewear|sportswear|leggings|joggers|sweatpants|pants|shorts|t-?shirt|shirt|jacket|hoodie|tracksuit|sports bra|bra|yoga top|yoga set|sports dress|dress|skirt|tank top|crop top|fitness top|compression wear|bodysuit|jumpsuit|underwear|boxer|vest)'
        AND NOT ((name || ' ' || coalesce(description, '')) ~*
          '(weighted vest|weight-bearing vest|load-bearing vest|tactical vest|hunting vest|foam roller|resistance band|exercise bike|pull-up bar|water bottle|shaker|gloves|brace|support sleeve|equipment)')
      )
    )
), classified AS (
  SELECT
    id,
    CASE
      WHEN category = 'Men''s Big & Tall'
        THEN ARRAY['L','XL','2XL','3XL','4XL','5XL']
      WHEN category IN ('Curve Underwear', 'Women''s Shapewear')
        THEN ARRAY['XL','2XL','3XL','4XL','5XL']
      ELSE ARRAY['XS','S','M','L','XL','2XL']
    END AS sizes,
    ARRAY(
      SELECT label
      FROM unnest(ARRAY[
        'Black','White','Cream','Beige','Khaki','Brown','Coffee','Grey',
        'Green','Blue','Navy','Pink','Red','Yellow','Orange','Purple',
        'Coral','Gold','Silver'
      ]) WITH ORDINALITY AS c(label, ord)
      WHERE body ~ ('\m' || lower(label) || '\M')
      ORDER BY ord
    ) AS colors
  FROM targets
), options AS (
  SELECT
    id,
    jsonb_build_array(jsonb_build_object(
      'name', 'Size',
      'values', to_jsonb(sizes)
    )) ||
    CASE
      WHEN cardinality(colors) > 1 THEN jsonb_build_array(jsonb_build_object(
        'name', 'Color',
        'values', to_jsonb(colors)
      ))
      ELSE '[]'::jsonb
    END AS variant_options
  FROM classified
)
UPDATE public.products p
SET variant_options = o.variant_options
FROM options o
WHERE p.id = o.id;

COMMIT;
