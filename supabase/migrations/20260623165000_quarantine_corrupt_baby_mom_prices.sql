-- Older Baby & Mom imports parsed four-digit Temu prices only up to the comma,
-- producing impossible R11/R12 landed costs. Hide those rows until they can be
-- rescraped from a trustworthy source price.
update public.products
set active = false,
    stock_status = 'out_of_stock'
where category = 'Baby & Mom'
  and active = true
  and cost_price in (11, 12);
