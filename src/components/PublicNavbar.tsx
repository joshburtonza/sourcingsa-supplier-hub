import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          boxShadow: "0 0 24px -6px var(--glow-strong)",
        }}>
        <div className="h-3 w-3 rounded-sm bg-black/80" />
      </div>
    </div>
  );
}

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/"><Logo /></Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href}
              className="text-sm text-[color:var(--foreground)] transition-colors hover:text-[color:var(--primary)]">
              {l.label}
            </a>
          ))}
          <Link to="/login" className="text-sm text-[color:var(--foreground)] hover:text-[color:var(--primary)]">
            Login
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a href="https://byjbdf-2k.myshopify.com/checkouts/cn/hWNCJl4hotDQ0n05xDu8oPnG/en-za?_r=AQABy_sDJ4mXBCFU5a7Bai_NPknqBl197qdTJdb9mCUKjEM&preview_theme_id=188057157949" target="_blank" rel="noreferrer"
            className="hidden rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn md:inline-flex">
            Get Access
          </a>
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--foreground)] md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[color:var(--border)] bg-black md:hidden">
          <div className="space-y-3 px-4 py-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block text-sm text-[color:var(--foreground)]">{l.label}</a>
            ))}
            <Link to="/login" className="block text-sm text-[color:var(--foreground)]">Login</Link>
            <a href="#pricing" onClick={() => setOpen(false)}
              className="block rounded-lg bg-[color:var(--primary)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--primary-foreground)]">
              Get Access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
