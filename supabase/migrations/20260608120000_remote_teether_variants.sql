-- Chelsea report, 2026-06-08:
-- the image clearly shows the remote-control teether in blue and black, but the
-- original scrape only captured "Options: Newborn", so the hub rendered no
-- customer choice. The Shopify product still has one checkout variant, so we
-- carry the colour through the cart/order note via variant_map.

BEGIN;

UPDATE public.products
SET
  variant_options = jsonb_build_array(jsonb_build_object(
    'name', 'Color',
    'values', jsonb_build_array('Blue', 'Black')
  )),
  variant_map = jsonb_build_array(
    jsonb_build_object(
      'variant_id', '51806784586045',
      'checkout_url', 'https://byjbdf-2k.myshopify.com/cart/51806784586045:1',
      'options', jsonb_build_object('Color', 'Blue')
    ),
    jsonb_build_object(
      'variant_id', '51806784586045',
      'checkout_url', 'https://byjbdf-2k.myshopify.com/cart/51806784586045:1',
      'options', jsonb_build_object('Color', 'Black')
    )
  ),
  description = regexp_replace(
    description,
    '\s*Options:\s*Newborn\.',
    ' Options: Blue, Black.',
    'i'
  )
WHERE category = 'Baby & Mom'
  AND name = '1pc Silicone Remote Control Teething Toy'
  AND shopify_url LIKE '%/products/1pc-silicone-remote-control-teething-toy';

COMMIT;
