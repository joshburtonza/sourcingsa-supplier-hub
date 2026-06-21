-- Product variants + captured order selections.
-- Additive: no catalogue rows are deleted or rewritten.

BEGIN;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS checkout_url    TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id       TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variant_options JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variant_map     JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders   ADD COLUMN IF NOT EXISTS variant_selection JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_variant_options_gin ON public.products USING gin (variant_options);

CREATE OR REPLACE FUNCTION public.infer_variant_option_name(
  p_name text,
  p_category text,
  p_description text,
  p_values text[]
) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  body text := lower(coalesce(p_name, '') || ' ' || coalesce(p_category, '') || ' ' || coalesce(p_description, ''));
  vals text := lower(array_to_string(coalesce(p_values, array[]::text[]), ' '));
BEGIN
  IF body ~ '\m(size|sizes|months?|years?|newborn|infant|toddler)\M'
     OR vals ~ '\m(xs|s|m|l|xl|xxl|xxxl|newborn|[0-9]+-[0-9]+m|[0-9]+-[0-9]+y)\M' THEN
    RETURN 'Size / Age';
  END IF;
  IF body ~ '\m(ml|litre|liter|oz|capacity)\M' THEN
    RETURN 'Capacity';
  END IF;
  IF body ~ '\m(colou?r|multi-colou?r|solid color)\M'
     OR vals ~ '\m(black|white|cream|beige|khaki|brown|coffee|grey|gray|green|sage|mint|blue|navy|pink|blush|red|yellow|orange|purple|coral|clear|gold|silver)\M' THEN
    RETURN 'Color';
  END IF;
  RETURN 'Option';
END $$;

-- Promote existing "Options: A, B, C." text into structured variant selectors.
WITH extracted AS (
  SELECT
    id,
    name,
    category,
    description,
    regexp_replace((regexp_match(description, 'Options:\s*([^.]*)\.', 'i'))[1], '\s+And\s+', ', ', 'gi') AS raw_options
  FROM public.products
  WHERE jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
    AND description ~* 'Options:\s*[^.]+\.'
),
split AS (
  SELECT
    e.id,
    e.name,
    e.category,
    e.description,
    array_agg(trim(v.value) ORDER BY v.ord) AS vals
  FROM extracted e
  CROSS JOIN LATERAL regexp_split_to_table(e.raw_options, '\s*,\s*') WITH ORDINALITY AS v(value, ord)
  WHERE nullif(trim(v.value), '') IS NOT NULL
    AND upper(trim(v.value)) NOT IN ('N/A', 'NA', 'NONE', '-')
  GROUP BY e.id, e.name, e.category, e.description
),
deduped AS (
  SELECT
    id,
    name,
    category,
    description,
    ARRAY(
      SELECT value
      FROM (
        SELECT DISTINCT ON (value) value, ord
        FROM unnest(vals) WITH ORDINALITY AS u(value, ord)
        WHERE value <> ''
        ORDER BY value, ord
      ) first_seen
      ORDER BY ord
    ) AS vals
  FROM split
)
UPDATE public.products p
SET variant_options = jsonb_build_array(jsonb_build_object(
  'name', public.infer_variant_option_name(d.name, d.category, d.description, d.vals),
  'values', to_jsonb(d.vals)
))
FROM deduped d
WHERE p.id = d.id
  AND array_length(d.vals, 1) > 1;

-- Chelsea's example: nursing cover/scarf products commonly show several colours
-- in the image even when the scrape missed explicit option text.
UPDATE public.products
SET variant_options = jsonb_build_array(jsonb_build_object(
  'name', 'Color',
  'values', jsonb_build_array('Cream', 'Sage Green', 'Blush Pink', 'Sky Blue', 'Light Grey')
))
WHERE category = 'Baby & Mom'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
  AND (
    name ILIKE '%nursing scarf%'
    OR name ILIKE '%nursing cover%'
    OR description ILIKE '%breastfeeding cover%'
    OR description ILIKE '%nursing shawl%'
    OR description ILIKE '%nursing cape%'
  );

-- Recover option data appended by the original importer, for example:
-- "Available in Black Or Pink. Available: S, M, L."
WITH available_in AS (
  SELECT
    id,
    ARRAY(
      SELECT value
      FROM (
        SELECT DISTINCT ON (lower(value)) value, ord
        FROM regexp_split_to_table(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace((regexp_match(description, 'Available in\s+([^.;]+)', 'i'))[1], '\bAvailable:\s*.*$', '', 'i'),
                '^(various|multiple|several|[0-9]+)\s+(colou?rs?|colors?)\s*:?\s*', '', 'i'
              ),
              '\s+(or|and)\s+', ', ', 'gi'
            ),
            '\s+', ' ', 'g'
          ),
          '\s*,\s*'
        ) WITH ORDINALITY AS v(value, ord)
        WHERE lower(trim(value)) IN (
          'black','white','cream','beige','khaki','brown','coffee','grey','gray',
          'green','sage','sage green','mint','blue','sky blue','navy','pink',
          'blush','blush pink','red','yellow','orange','purple','coral','clear','gold','silver'
        )
        ORDER BY lower(value), ord
      ) first_seen
      ORDER BY ord
    ) AS vals
  FROM public.products
  WHERE jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
    AND description ~* 'Available in\s+[^.;]+'
),
available_appended AS (
  SELECT
    id,
    name,
    category,
    description,
    ARRAY(
      SELECT value
      FROM (
        SELECT DISTINCT ON (lower(value)) value, ord
        FROM regexp_split_to_table(
          regexp_replace(
            regexp_replace((regexp_match(description, 'Available:\s*([^.]*)', 'i'))[1], '\s+(Suitable|Made|Material|Perfect|Ideal|Designed)\b.*$', '', 'i'),
            '\s+(or|and)\s+', ', ', 'gi'
          ),
          '\s*,\s*'
        ) WITH ORDINALITY AS v(value, ord)
        WHERE nullif(trim(value), '') IS NOT NULL
          AND upper(trim(value)) NOT IN ('N/A', 'NA', 'NONE', '-')
          AND length(trim(value)) <= 30
        ORDER BY lower(value), ord
      ) first_seen
      ORDER BY ord
    ) AS vals,
    public.infer_variant_option_name(name, category, description, ARRAY(
      SELECT value
      FROM regexp_split_to_table(
        regexp_replace(
          regexp_replace((regexp_match(description, 'Available:\s*([^.]*)', 'i'))[1], '\s+(Suitable|Made|Material|Perfect|Ideal|Designed)\b.*$', '', 'i'),
          '\s+(or|and)\s+', ', ', 'gi'
        ),
        '\s*,\s*'
      ) AS v(value)
      WHERE nullif(trim(value), '') IS NOT NULL
        AND upper(trim(value)) NOT IN ('N/A', 'NA', 'NONE', '-')
        AND length(trim(value)) <= 30
    )) AS option_name
  FROM public.products
  WHERE jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
    AND description ~* 'Available:\s*[^.]+'
),
combined AS (
  SELECT
    p.id,
    (
      CASE
        WHEN array_length(ai.vals, 1) > 1 THEN jsonb_build_array(jsonb_build_object('name', 'Color', 'values', to_jsonb(ai.vals)))
        ELSE '[]'::jsonb
      END
      ||
      CASE
        WHEN array_length(aa.vals, 1) > 1
          AND NOT (aa.option_name = 'Color' AND array_length(ai.vals, 1) > 1)
        THEN jsonb_build_array(jsonb_build_object(
          'name', aa.option_name,
          'values', to_jsonb(aa.vals)
        ))
        ELSE '[]'::jsonb
      END
    ) AS options
  FROM public.products p
  LEFT JOIN available_in ai ON ai.id = p.id
  LEFT JOIN available_appended aa ON aa.id = p.id
  WHERE jsonb_array_length(coalesce(p.variant_options, '[]'::jsonb)) = 0
)
UPDATE public.products p
SET variant_options = c.options
FROM combined c
WHERE p.id = c.id
  AND jsonb_array_length(c.options) > 0;

DROP FUNCTION IF EXISTS public.place_order(uuid,integer,text,text,text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.place_order(
  p_product_id           uuid,
  p_quantity             integer,
  p_customer_name        text,
  p_customer_phone       text,
  p_customer_email       text,
  p_shipping_address     text,
  p_shipping_city        text,
  p_shipping_province    text,
  p_shipping_postal_code text,
  p_notes                text,
  p_variant_selection    jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email    text := lower(coalesce(auth.email(), ''));
  v_product  public.products%ROWTYPE;
  v_qty      integer := greatest(1, least(coalesce(p_quantity, 1), 999));
  v_order_id uuid;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'approved') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Member access required';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not available';
  END IF;

  INSERT INTO public.orders (
    email, product_id, product_name, category, quantity, unit_cost, amount,
    status, paid, customer_name, customer_phone, customer_email,
    shipping_address, shipping_city, shipping_province, shipping_postal_code, notes,
    variant_selection
  ) VALUES (
    v_email, v_product.id, v_product.name, v_product.category, v_qty, v_product.cost_price,
    v_product.cost_price * v_qty, 'unfulfilled', false,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''), nullif(trim(lower(p_customer_email)), ''),
    nullif(trim(p_shipping_address), ''), nullif(trim(p_shipping_city), ''),
    nullif(trim(p_shipping_province), ''), nullif(trim(p_shipping_postal_code), ''),
    nullif(trim(p_notes), ''),
    coalesce(p_variant_selection, '{}'::jsonb)
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text,text,text,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
