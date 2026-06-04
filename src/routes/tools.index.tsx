import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, CheckCircle2, Calculator, Megaphone, ImageIcon, Sparkles } from "lucide-react";
import { ProtectedShell } from "@/components/ProtectedShell";

export const Route = createFileRoute("/tools/")({
  component: () => (
    <ProtectedShell>
      <AiStudio />
    </ProtectedShell>
  ),
  head: () => ({ meta: [{ title: "AI Studio, ZA Supplier Hub" }] }),
});

type Tool = {
  to?: string;
  icon: typeof Flame;
  name: string;
  desc: string;
  live: boolean;
};

const TOOLS: Tool[] = [
  { to: "/tools/niche-finder", icon: Flame, name: "Niche Finder", desc: "3 SA niches that fit you, matched to real products in the catalogue.", live: true },
  { icon: CheckCircle2, name: "Product Validator", desc: "Score any product across 24 dropshipping criteria before you commit.", live: false },
  { icon: Calculator, name: "Profit Calculator", desc: "Work out margins, breakeven and ad budget on cost vs sell price.", live: false },
  { icon: Megaphone, name: "Ad Generator", desc: "TikTok, Reels and Meta ad scripts with hooks and overlays.", live: false },
  { icon: ImageIcon, name: "Image Studio", desc: "Generate clean hero images for your store from a product.", live: false },
];

function AiStudio() {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Studio</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Research, validate and launch winning products, all wired to your supplier catalogue.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
                  <t.icon className="h-5 w-5" />
                </span>
                {t.live ? (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live</span>
                ) : (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">Soon</span>
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{t.name}</h3>
              <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">{t.desc}</p>
            </>
          );
          return t.live && t.to ? (
            <Link key={t.name} to={t.to} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 transition-colors hover:border-[color:var(--primary)] glow-card-hover">
              {inner}
            </Link>
          ) : (
            <div key={t.name} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 opacity-60">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
