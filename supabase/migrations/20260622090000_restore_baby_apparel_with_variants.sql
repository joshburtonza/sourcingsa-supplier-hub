-- Restore the baby apparel quarantined on 2026-06-21, now with usable
-- size/age selectors. Colour choices are included only when at least two
-- colours are explicitly present in the listing text. Selections are carried
-- in the Shopify cart note and recorded on the hub order.

BEGIN;

WITH targets AS (
  SELECT
    id,
    lower(name || ' ' || coalesce(description, '')) AS body
  FROM public.products
  WHERE category = 'Baby & Mom'
    AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
    AND (
      (
        NOT active
        AND updated_at = '2026-06-21 21:36:44.913059+00'::timestamptz
        AND (name || ' ' || coalesce(description, '')) ~*
          '\m(romper|bodysuit|jumpsuit|onesie|outfit|clothing|clothes|sweater|pants set|dress|shirt|jacket|vest|tracksuit|overalls)\M'
      )
      OR (
        active
        AND (name || ' ' || coalesce(description, '')) ~*
          '\m(rompers?|bodysuits?|jumpsuits?|onesies?|outfits?|sweaters?|sweatshirts?|pants set|dresses?|shirts?|shorts?|jackets?|vests?|tracksuits?|overalls)\M'
      )
    )
), classified AS (
  SELECT
    id,
    body,
    CASE
      WHEN body ~ '\m(maternity|women|women''s)\M'
        THEN ARRAY['S','M','L','XL']
      WHEN body ~ '0\s*-\s*18\s*(m|months?)\M'
        THEN ARRAY['0-3M','3-6M','6-9M','9-12M','12-18M']
      WHEN body ~ '0\s*-\s*12\s*(m|months?)\M'
        THEN ARRAY['0-3M','3-6M','6-9M','9-12M']
      WHEN body ~ '0\s*-\s*9\s*(m|months?)\M'
        THEN ARRAY['0-3M','3-6M','6-9M']
      WHEN body ~ '\m(toddler|0\s*-\s*3\s*(y|years?))\M'
        THEN ARRAY['1-2Y','2-3Y','3-4Y']
      WHEN body ~ '\m(newborn|infant|baby)\M'
        THEN ARRAY['Newborn','0-3M','3-6M','6-9M','9-12M']
      ELSE ARRAY['2-3Y','3-4Y','4-5Y','5-6Y']
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
      'name', 'Size / Age',
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
SET
  variant_options = o.variant_options,
  active = true
FROM options o
WHERE p.id = o.id;

COMMIT;
