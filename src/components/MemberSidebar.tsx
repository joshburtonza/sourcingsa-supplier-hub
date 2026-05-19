import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { clearSession, useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.png";

type Item = { to: string; label: string; icon: typeof Home };

const NAV: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/products", label: "Find Products", icon: Search },
  { to: "/trending", label: "Trending Products", icon: Flame },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/request-product", label: "Request a Product", icon: PlusCircle },
  { to: "/support", label: "Support", icon: MessageCircle },
];

function Logo() {
  return (
    <img src={logo} alt="ZA Supplier Hub" className="h-auto w-[160px] object-contain" />
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = path === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
                : "text-[color:var(--foreground)] hover:bg-white/5 hover:text-[color:var(--primary)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MemberShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    clearSession();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
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
        <button
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--foreground)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
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
    </div>
  );
}
