-- Complete customer-selectable options for footwear and wearable fitness
-- products, and remove misleading dumbbell options imported as apparel sizes.

BEGIN;

UPDATE public.products
SET variant_options = jsonb_build_array(jsonb_build_object(
  'name', 'EU Size',
  'values', CASE
    WHEN (name || ' ' || coalesce(description, '')) ~*
      '(infant|baby|soft[ -]?sole|sock shoes|first walker)'
      THEN '["16","17","18","19","20","21","22"]'::jsonb
    ELSE '["26","27","28","29","30","31","32","33","34","35","36","37"]'::jsonb
  END
))
WHERE active
  AND category = 'Kids'' Shoes'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0;

UPDATE public.products
SET variant_options = jsonb_build_array(jsonb_build_object(
  'name', 'EU Size',
  'values', CASE
    WHEN (name || ' ' || coalesce(description, '')) ~*
      '(women|unisex|couple|slipper|sandal)'
      THEN '["36","37","38","39","40","41","42","43","44","45","46"]'::jsonb
    ELSE '["39","40","41","42","43","44","45","46","47","48"]'::jsonb
  END
))
WHERE active
  AND category = 'Men''s Wide Fit Shoes'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0;

UPDATE public.products
SET variant_options = '[{"name":"Size","values":["S","M","L"]}]'::jsonb
WHERE active
  AND category = 'Fitness'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
  AND (name || ' ' || coalesce(description, '')) ~*
    '(fitness gloves|gym gloves|weightlifting gloves|half-finger.*gloves|knee brace)';

UPDATE public.products
SET variant_options = '[{"name":"Size","values":["S","M","L","XL"]}]'::jsonb
WHERE active
  AND category = 'Fitness'
  AND jsonb_array_length(coalesce(variant_options, '[]'::jsonb)) = 0
  AND name ~* 'weightlifting belt';

UPDATE public.products
SET
  variant_options = '[{"name":"Pack quantity","values":["1 dumbbell","Pair (2 dumbbells)"]}]'::jsonb,
  description = 'Hexagonal plastic dumbbells for home or gym strength training. Choose either one dumbbell or a pair (2 dumbbells).'
WHERE id = 'd5dd9b3c-e061-4e5a-9f5f-d7d66f83c274'::uuid;

UPDATE public.products
SET
  variant_options = '[]'::jsonb,
  description = 'Pink hand-weight set. Includes one pair (2 dumbbells), 2kg each.'
WHERE id = '0488d839-41b9-487a-bd19-1abbb7fefca4'::uuid;

UPDATE public.products
SET
  variant_options = '[]'::jsonb,
  description = regexp_replace(description, ' Available: S, L, M\\.?$', '')
WHERE id = 'c1cc5635-7597-4b54-b358-7b032e7090a3'::uuid;

UPDATE public.products
SET variant_options = '[{"name":"Weight (each)","values":["1KG","2KG","3KG","4KG","5KG","6KG","8KG","10KG"]}]'::jsonb
WHERE id = '470ec3ec-16ce-4acb-8bec-68b8b4054a88'::uuid;

UPDATE public.products
SET description = 'Neoprene dumbbell pair for home or gym training. Choose the weight of each dumbbell: 1kg, 2kg, 3kg, 4kg, 5kg, 6kg, 8kg, or 10kg.'
WHERE id = '470ec3ec-16ce-4acb-8bec-68b8b4054a88'::uuid;

UPDATE public.products
SET variant_options = '[{"name":"Weight","values":["1KG","2KG","3KG"]}]'::jsonb
WHERE id = '60947e14-5570-4696-a8ed-47eb0a257039'::uuid;

UPDATE public.products
SET description = 'Hexagonal fitness dumbbell for home-gym strength training. Choose a 1kg, 2kg, or 3kg weight.'
WHERE id = '60947e14-5570-4696-a8ed-47eb0a257039'::uuid;

-- These listings use a full-rack image or omit the supplied unit/weight.
-- Keep them out of the catalogue until the source offer can be verified.
UPDATE public.products
SET active = false, stock_status = 'out_of_stock'
WHERE id IN (
  'd9590f93-9178-499f-a1ef-ff1652510cc9'::uuid,
  'e3c84f84-ad2b-404e-9239-2d2705cf0304'::uuid,
  'ff67502f-d071-49b4-b868-e8960c20e5fd'::uuid
);

COMMIT;
