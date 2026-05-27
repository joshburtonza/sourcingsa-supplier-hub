import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const CHECKOUT_URL = "https://byjbdf-2k.myshopify.com/checkouts/cn/hWNCJl4hotDQ0n05xDu8oPnG/en-za?_r=AQABy_sDJ4mXBCFU5a7Bai_NPknqBl197qdTJdb9mCUKjEM&preview_theme_id=188057157949";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1F1F1F] bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-white">
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
            className="btn-purple hidden px-5 py-2 text-sm md:inline-flex">
            Get Access
          </a>
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#1F1F1F] text-white md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1F1F1F] bg-black md:hidden">
          <div className="space-y-3 px-4 py-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-[#A1A1AA]">
                {l.label}
              </a>
            ))}
            <Link to="/login" className="block text-sm text-[#A1A1AA]">Login</Link>
            <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
              className="btn-purple block px-4 py-2 text-center text-sm">
              Get Access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
