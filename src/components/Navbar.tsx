import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.png";

function Logo() {
  return (
    <img src={logo} alt="ZA Supplier Hub" className="h-auto w-[140px] object-contain" />
  );
}

export function Navbar() {
  const { fullName, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await doSignOut();
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
          <Link to="/dashboard">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/dashboard" className={linkCls(path === "/dashboard")}>
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
        <Link to="/dashboard" className={linkCls(path === "/dashboard")}>Catalogue</Link>
        <Link to="/how-to-order" className={linkCls(path === "/how-to-order")}>How to Order</Link>
      </div>
    </header>
  );
}
