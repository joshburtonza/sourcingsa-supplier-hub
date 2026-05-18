import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          boxShadow: "0 0 24px -6px var(--glow-strong)",
        }}
      >
        <div className="h-3 w-3 rounded-sm bg-black/80" />
      </div>
    </div>
  );
}

export function Navbar() {
  const { fullName } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const linkCls = (active: boolean) =>
    `text-sm transition-colors ${
      active ? "text-[color:var(--primary)]" : "text-[color:var(--foreground)] hover:text-[color:var(--primary)]"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className={linkCls(path === "/")}>
              Catalogue
            </Link>
            <Link to="/how-to-order" className={linkCls(path === "/how-to-order")}>
              How to Order
            </Link>
          </nav>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          {fullName && (
            <span className="text-sm text-[color:var(--muted-foreground)]">
              Welcome <span className="text-[color:var(--foreground)]">{fullName}</span>
            </span>
          )}
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 border-t border-[color:var(--border)] py-2 md:hidden">
        <Link to="/" className={linkCls(path === "/")}>Catalogue</Link>
        <Link to="/how-to-order" className={linkCls(path === "/how-to-order")}>How to Order</Link>
      </div>
    </header>
  );
}
