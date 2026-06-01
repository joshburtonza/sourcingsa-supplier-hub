-- Reinstate the role-based authorisation that the third migration
-- (20260518214545) dropped, plus tighten products + orders RLS so the
-- now-public repo's URL can't be used to read the catalogue without a
-- paid `approved` role.
--
-- Apply via the Supabase dashboard SQL editor for project
-- `jxqyxovqagwttjltagon`, or `supabase db push` if the project is
-- linked locally.

-- ───────────────── Roles ─────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ───────────────── Products: only approved members can read ─────────────────
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Approved view products" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

CREATE POLICY "Approved view products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'approved') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ───────────────── Orders: members see only their own (matched by email) ───
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;

-- auth.email() resolves to the signed-in user's email from the JWT.
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.email()));

CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ───────────────── Seed: grant approved + admin to founders ────────────────
-- Pre-grants the role so the owner accounts have access the moment
-- they sign up with their email. INSERT is keyed by user_id which only
-- exists after signup — so this CTE pulls user_id from auth.users by
-- email when it's already present, otherwise a one-off SQL run after
-- they sign up will populate.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN (
  'josh@amalfiai.com',
  'schoemanhenro@gmail.com',
  'sethpon123@gmail.com',
  'jankosteyn0@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'approved'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN (
  'josh@amalfiai.com',
  'schoemanhenro@gmail.com',
  'sethpon123@gmail.com',
  'jankosteyn0@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
