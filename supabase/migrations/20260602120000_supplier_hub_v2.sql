-- ZA Supplier Hub — v2 foundation
-- Functional ordering loop + admin operations + DropStore account link.
--
-- Idempotent and safe to re-run. Apply via `supabase db push` (when the
-- CLI is linked to project jxqyxovqagwttjltagon) or by pasting this whole
-- file into the Supabase SQL editor for that project.
--
-- Depends on 20260601090000_reinstate_roles_and_rls.sql (roles + has_role
-- + base products/orders RLS). Run that first if it hasn't been applied.

-- ─────────────────────── PRODUCTS: richer catalogue ───────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_note TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status  TEXT NOT NULL DEFAULT 'in_stock'; -- in_stock | low_stock | out_of_stock
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images        JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active        BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();
-- The order loop is in-app now (not a per-product external link), so a
-- Shopify URL is optional. Kept for an optional "buy on Shopify" path later.
ALTER TABLE public.products ALTER COLUMN shopify_url DROP NOT NULL;

-- ─────────────────────── ORDERS: full fulfilment shape ───────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id           UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity             INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unit_cost            NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid                 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name        TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone       TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email       TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address     TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_city        TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_province    TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number      TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier              TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes                TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_status     ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);

-- ─────────────────────── place_order RPC ───────────────────────
-- Members never INSERT into orders directly — they call this SECURITY
-- DEFINER function. The amount is computed from the product's real
-- cost_price server-side, so a tampered client payload cannot change
-- what is recorded. email is taken from the caller's JWT, not the body.
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
  p_notes                text
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
    shipping_address, shipping_city, shipping_province, shipping_postal_code, notes
  ) VALUES (
    v_email, v_product.id, v_product.name, v_product.category, v_qty, v_product.cost_price,
    v_product.cost_price * v_qty, 'unfulfilled', false,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''), nullif(trim(lower(p_customer_email)), ''),
    nullif(trim(p_shipping_address), ''), nullif(trim(p_shipping_city), ''),
    nullif(trim(p_shipping_province), ''), nullif(trim(p_shipping_postal_code), ''),
    nullif(trim(p_notes), '')
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text,text,text) TO authenticated;

-- ─────────────────────── PRODUCT REQUESTS ───────────────────────
CREATE TABLE IF NOT EXISTS public.product_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  product_url     TEXT,
  image_url       TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'new',  -- new | sourcing | quoted | closed
  quote_cost      NUMERIC(10,2),
  quote_sell      NUMERIC(10,2),
  admin_reply     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_product_requests_email  ON public.product_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON public.product_requests(status);

DROP POLICY IF EXISTS "Members create requests" ON public.product_requests;
CREATE POLICY "Members create requests" ON public.product_requests FOR INSERT TO authenticated
  WITH CHECK (lower(requester_email) = lower(auth.email()));
DROP POLICY IF EXISTS "Members view own requests" ON public.product_requests;
CREATE POLICY "Members view own requests" ON public.product_requests FOR SELECT TO authenticated
  USING (lower(requester_email) = lower(auth.email()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage requests" ON public.product_requests;
CREATE POLICY "Admins manage requests" ON public.product_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────── SUPPORT TICKETS ───────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open', -- open | answered | closed
  admin_reply TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);

DROP POLICY IF EXISTS "Members create tickets" ON public.support_tickets;
CREATE POLICY "Members create tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower(auth.email()));
DROP POLICY IF EXISTS "Members view own tickets" ON public.support_tickets;
CREATE POLICY "Members view own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.email()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage tickets" ON public.support_tickets;
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────── PROFILES: store info + DropStore link ───────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone                TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_url            TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dropstore_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dropstore_email      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dropstore_tier       TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dropstore_linked_at  TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT now();

-- Admins need to see + manage every member from the admin panel. Members
-- keep their existing view/update-own policies from the base migration.
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────── updated_at triggers ───────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_products_touch ON public.products;
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_orders_touch ON public.orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_requests_touch ON public.product_requests;
CREATE TRIGGER trg_requests_touch BEFORE UPDATE ON public.product_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_tickets_touch ON public.support_tickets;
CREATE TRIGGER trg_tickets_touch BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─────────────────────── STORAGE: product images bucket ───────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- ─────────────────────── STARTER CATALOGUE (seed only if empty) ───────────────────────
-- Representative SA-market dropshipping products with real recommended
-- pricing. Images are left null (cards show a clean category placeholder)
-- — the team uploads real product photos via the admin panel. Guarded so
-- it never duplicates or clobbers a catalogue the team has already built.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.products) = 0 THEN
    INSERT INTO public.products (name, category, cost_price, sell_price, description, trending, sales_count, stock_status) VALUES
      ('Posture Corrector Brace',        'Fitness',        79.00,  249.00, 'Adjustable breathable back-posture support. Strong year-round demand on SA TikTok.', true,  640, 'in_stock'),
      ('Resistance Bands Set (5pc)',      'Fitness',        69.00,  219.00, 'Five graded latex bands with door anchor and carry bag. Evergreen home-gym seller.',  true,  512, 'in_stock'),
      ('Smart Skipping Rope',             'Fitness',       119.00,  329.00, 'Digital counter rope with cordless mode. High repeat-buy fitness product.',          false, 188, 'in_stock'),
      ('LED Face Mask',                   'Beauty',        389.00, 1099.00, 'Seven-colour light-therapy mask. Premium beauty hero product with big margin.',      true,  430, 'in_stock'),
      ('Jade Roller & Gua Sha Set',       'Beauty',         59.00,  199.00, 'Natural stone facial roller and gua sha in a gift box. Low cost, high perceived value.', false, 274, 'in_stock'),
      ('Heatless Curl Kit',               'Hair Care',      69.00,  219.00, 'Satin curling rod with clips for overnight heatless curls. Viral hair product.',     true,  356, 'in_stock'),
      ('Scalp Massager Shampoo Brush',    'Hair Care',      39.00,  139.00, 'Silicone scalp brush for deeper cleansing and growth stimulation. Great impulse buy.', false, 210, 'in_stock'),
      ('Vitamin C Serum',                 'Skincare',       89.00,  269.00, 'Brightening vitamin C + hyaluronic serum. Recurring skincare revenue.',              false, 168, 'in_stock'),
      ('Stainless Steel Necklace',        'Jewellery',      49.00,  199.00, 'Waterproof 18k-gold-plated steel chain. Does not tarnish — low returns.',            false, 142, 'in_stock'),
      ('Moissanite Tennis Bracelet',      'Jewellery',     149.00,  499.00, 'Sparkling lab-stone tennis bracelet in a gift box. Strong gifting seller.',          true,  301, 'in_stock'),
      ('Aroma Diffuser 300ml',            'Home & Kitchen', 129.00,  379.00, 'Ultrasonic LED diffuser with auto-off. Reliable home category staple.',              false, 220, 'in_stock'),
      ('LED Strip Lights 5m',             'Home & Kitchen',  99.00,  299.00, 'App + remote RGB strip with music sync. Consistent youth-market seller.',            true,  398, 'in_stock'),
      ('Mini Vacuum Sealer',              'Home & Kitchen', 159.00,  449.00, 'Handheld food vacuum sealer with starter bags. Practical kitchen win.',              false, 96,  'in_stock'),
      ('Wireless Earbuds Pro',            'Tech',          229.00,  649.00, 'ANC TWS earbuds with charging case and LED battery display. High-volume electronics.', true,  720, 'in_stock'),
      ('Magnetic Wireless Power Bank',    'Tech',          189.00,  549.00, '10 000mAh MagSafe-compatible magnetic power bank. Premium tech accessory.',          false, 152, 'in_stock'),
      ('Phone Tripod with Remote',        'Tech',           99.00,  279.00, 'Extendable tripod with Bluetooth shutter. Creator-economy bestseller.',              false, 130, 'in_stock'),
      ('Slow-Feeder Dog Bowl',            'Pet Products',    59.00,  189.00, 'Anti-gulp maze bowl for healthier eating. Easy pet-niche margin.',                   false, 117, 'in_stock'),
      ('LED Rechargeable Pet Collar',     'Pet Products',    69.00,  219.00, 'USB-rechargeable glow collar for night walks. Strong impulse pet buy.',              false, 143, 'in_stock'),
      ('Oversized Hoodie Blanket',        'Fashion',        159.00,  449.00, 'Wearable sherpa hoodie blanket. Seasonal winter hero in SA.',                        true,  410, 'in_stock'),
      ('Beard Grooming Kit',              'Men''s Grooming', 99.00,  299.00, 'Beard oil, balm, brush and scissors in a gift box. Great Father''s-Day seller.',     false, 176, 'in_stock'),
      ('Electric Nose & Ear Trimmer',     'Men''s Grooming', 79.00,  239.00, 'Painless rechargeable trimmer. Reliable men''s grooming repeat buy.',                false, 121, 'in_stock'),
      ('Baby Silicone Feeding Set',       'Baby & Mom',      89.00,  259.00, 'Suction bowl, plate, bib and spoons in food-grade silicone. Trusted parent buy.',    false, 134, 'in_stock'),
      ('White-Noise Baby Soother',        'Baby & Mom',     129.00,  369.00, 'Portable sound machine with night light and timer. High-satisfaction baby product.', false, 108, 'in_stock'),
      ('Car Phone Mount (MagSafe)',       'Tech',            69.00,  219.00, 'Strong magnetic vent mount. Cheap, universal, fast-moving accessory.',               false, 162, 'in_stock');
  END IF;
END $$;
