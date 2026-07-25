import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  Flame,
  Package,
  PlusCircle,
  MessageCircle,
  LogOut,
  Menu,
  X,
  User,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider } from "@/lib/cart";
import { CartDrawer, CartButton } from "./CartDrawer";
import logo from "@/assets/logo.png";

type Item = { to: string; label: string; icon: typeof Home; countKey?: "products" | "orders" };

const NAV: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/products", label: "Find Products", icon: Search, countKey: "products" },
  { to: "/trending", label: "Trending Products", icon: Flame },
  { to: "/tools", label: "AI Studio", icon: Sparkles },
  { to: "/orders", label: "Orders", icon: Package, countKey: "orders" },
  { to: "/request-product", label: "Request a Product", icon: PlusCircle },
  { to: "/account", label: "Account", icon: User },
  { to: "/support", label: "Support", icon: MessageCircle },
];

function Logo() {
  return <img src={logo} alt="ZA Supplier Hub" className="h-auto w-[160px] object-contain" />;
}

/** Product catalogue size + this member's open (not delivered/cancelled) order count. */
function useNavCounts() {
  const [counts, setCounts] = useState<{ products: number | null; orders: number | null }>({
    products: null,
    orders: null,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(delivered,cancelled)"),
      ]);
      if (cancelled) return;
      if (productsRes.error)
        console.error("[nav-counts] products count failed", productsRes.error.message);
      if (ordersRes.error)
        console.error("[nav-counts] orders count failed", ordersRes.error.message);
      setCounts({
        products: productsRes.error ? null : (productsRes.count ?? null),
        orders: ordersRes.error ? null : (ordersRes.count ?? null),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return counts;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  const counts = useNavCounts();
  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const items: Item[] = isAdmin
    ? [...NAV, { to: "/admin", label: "Admin", icon: LayoutDashboard }]
    : NAV;
  const activeTo = items.find(
    (i) => i.to === path || (i.to === "/admin" && path.startsWith("/admin")),
  )?.to;

  useEffect(() => {
    const nav = navRef.current;
    const el = activeTo ? itemRefs.current[activeTo] : null;
    if (!nav || !el) {
      setPillStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    setPillStyle({ top: el.offsetTop, height: el.offsetHeight, opacity: 1 });
  }, [activeTo]);

  return (
    <nav ref={navRef} className="relative flex flex-col gap-1">
      <span
        aria-hidden
        className="absolute left-0 right-0 rounded-lg border border-[color:var(--blue-line)] bg-[color:var(--blue-dim)] transition-[top,height,opacity] duration-300 ease-out"
        style={{ top: pillStyle.top, height: pillStyle.height, opacity: pillStyle.opacity }}
      />
      {items.map(({ to, label, icon: Icon, countKey }) => {
        const active = to === activeTo;
        const isAdminLink = to === "/admin";
        const count = countKey ? counts[countKey] : null;
        return (
          <Link
            key={to}
            ref={(el) => {
              itemRefs.current[to] = el;
            }}
            to={to}
            onClick={onNavigate}
            className={`relative z-10 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isAdminLink ? "mt-1 border-t border-[color:var(--border)] pt-3.5" : ""
            } ${
              active
                ? "text-[color:var(--primary)]"
                : "text-[color:var(--foreground)] hover:bg-white/5 hover:text-[color:var(--primary)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count !== null && count > 0 && (
              <span className="ml-auto rounded-full bg-white/8 px-1.5 py-0.5 text-[11px] font-bold text-[color:var(--muted-foreground)]">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MemberShell({ children }: { children: ReactNode }) {
  const { user, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await doSignOut();
    navigate({ to: "/login" });
  };

  return (
    <CartProvider email={user?.email ?? null}>
      <div className="min-h-screen">
        {/* Desktop cart button (floating, top-right) */}
        <div className="fixed right-6 top-5 z-30 hidden lg:block">
          <CartButton />
        </div>

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6 lg:flex">
          <div className="px-2 pb-6">
            <Logo />
          </div>
          <NavList />
          <div className="mt-auto border-t border-[color:var(--border)] pt-4">
            {user?.email && (
              <div className="px-2 pb-3 text-xs text-[color:var(--muted-foreground)] truncate">
                {user.email}
              </div>
            )}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--foreground)] transition-colors hover:bg-white/5 hover:text-[color:var(--primary)]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-black/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <CartButton />
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--foreground)]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6">
              <div className="flex items-center justify-between pb-6">
                <Logo />
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)]"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavList onNavigate={() => setOpen(false)} />
              <div className="mt-auto border-t border-[color:var(--border)] pt-4">
                {user?.email && (
                  <div className="px-2 pb-3 text-xs text-[color:var(--muted-foreground)] truncate">
                    {user.email}
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="lg:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
        </main>

        <CartDrawer />
      </div>
    </CartProvider>
  );
}
