CREATE TYPE public.order_status AS ENUM ('unfulfilled','processing','in_transit','delivered','cancelled');

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'unfulfilled',
  shopify_order_id TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_email ON public.orders(email);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view orders"
ON public.orders FOR SELECT
USING (true);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS trending BOOLEAN NOT NULL DEFAULT false;