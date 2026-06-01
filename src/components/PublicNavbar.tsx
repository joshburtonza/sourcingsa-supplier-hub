import { Link } from "@tanstack/react-router";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { CHECKOUT_URL } from "@/lib/checkout";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50" style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-white">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[rgba(107,79,232,0.25)] border border-[rgba(107,79,232,0.5)]">
            <Zap className="h-3.5 w-3.5 text-white" />
          </span>
          ZA Supplier Hub
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-[#A1A1AA] transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
          <Link to="/login" className="text-sm text-[#A1A1AA] hover:text-white">Login</Link>
        </nav>

        <div className="flex items-center gap-3">
          <a href={CHECKOUT_URL} target="_blank" rel="noreferrer"
            className="glass-pill-purple hidden px-5 py-2 text-sm md:inline-flex">
            Get Access
          </a>
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu"
            className="glass-pill grid h-9 w-9 place-items-center md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black/60 md:hidden">
          <div className="space-y-3 px-4 py-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-[#A1A1AA]">
                {l.label}
              </a>
            ))}
            <Link to="/login" className="block text-sm text-[#A1A1AA]">Login</Link>
            <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
              className="glass-pill-purple block px-4 py-2 text-center text-sm">
              Get Access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
