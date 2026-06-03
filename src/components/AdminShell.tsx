import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Inbox,
  Users,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Item = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/requests", label: "Requests", icon: Inbox },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
];

/**
 * Wraps every /admin page. Gates on the `admin` role: loading → spinner,
 * not signed in → /login, signed in but not admin → a clear refusal (RLS
 * also blocks the queries, this just avoids a wall of empty tables).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
      </div>
    );
  }

  if (!session) {
    navigate({ to: "/login" });
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center glow-card">
          <h1 className="text-2xl font-semibold text-white">Admins only</h1>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">This area is restricted to the ZA Supplier Hub team.</p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">Back to my dashboard</Link>
        </div>
      </div>
    );
  }

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-2 pb-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--primary)] text-sm font-bold text-white">ZA</span>
          <div>
            <div className="text-sm font-semibold text-white">Admin</div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">Supplier Hub</div>
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/admin" ? path === "/admin" : path.startsWith(to);
          return (
            <Link key={to} to={to} onClick={onNavigate} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]" : "text-[color:var(--foreground)] hover:bg-white/5 hover:text-[color:var(--primary)]"}`}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-1 border-t border-[color:var(--border)] pt-4">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Member view
        </Link>
        <button onClick={() => void signOut().then(() => navigate({ to: "/login" }))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-white/5 hover:text-[color:var(--primary)]">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6 lg:flex">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-black/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <span className="font-semibold text-white">Admin</span>
        <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-white" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] px-4 py-6">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)]" aria-label="Close"><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
