
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'approved');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  sell_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  shopify_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved view products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'approved') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed products
INSERT INTO public.products (name, category, cost_price, sell_price, shopify_url) VALUES
('Resistance Band Set','Fitness',89.00,249.00,'https://shopify.com/products/resistance-band-set'),
('Smart Skipping Rope','Fitness',129.00,349.00,'https://shopify.com/products/smart-rope'),
('Adjustable Dumbbells','Fitness',459.00,1199.00,'https://shopify.com/products/dumbbells'),
('Pet Grooming Glove','Pet Products',69.00,199.00,'https://shopify.com/products/pet-glove'),
('Automatic Pet Feeder','Pet Products',289.00,799.00,'https://shopify.com/products/pet-feeder'),
('LED Pet Collar','Pet Products',79.00,229.00,'https://shopify.com/products/led-collar'),
('Wireless Earbuds Pro','Tech',249.00,699.00,'https://shopify.com/products/earbuds'),
('Magnetic Phone Charger','Tech',139.00,399.00,'https://shopify.com/products/magsafe'),
('Mini Projector HD','Tech',699.00,1899.00,'https://shopify.com/products/projector'),
('Geometric Wall Mirror','Home Decor',189.00,549.00,'https://shopify.com/products/mirror'),
('LED Strip Lights 5m','Home Decor',99.00,299.00,'https://shopify.com/products/led-strip'),
('Aroma Diffuser','Home Decor',149.00,449.00,'https://shopify.com/products/diffuser'),
('Jade Roller Set','Beauty',79.00,239.00,'https://shopify.com/products/jade-roller'),
('LED Face Mask','Beauty',389.00,1099.00,'https://shopify.com/products/led-mask'),
('Heatless Curler Kit','Beauty',89.00,259.00,'https://shopify.com/products/curler'),
('Car Phone Mount','Automotive',69.00,199.00,'https://shopify.com/products/car-mount'),
('Portable Tyre Inflator','Automotive',299.00,849.00,'https://shopify.com/products/inflator'),
('Car Vacuum Cleaner','Automotive',189.00,549.00,'https://shopify.com/products/car-vacuum');
