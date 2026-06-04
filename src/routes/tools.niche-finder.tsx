import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Flame, ArrowLeft, Sparkles, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { fmtZAR } from "@/lib/orders";

export const Route = createFileRoute("/tools/niche-finder")({
  component: () => (
    <ProtectedShell>
      <NicheFinder />
    </ProtectedShell>
  ),
  head: () => ({ meta: [{ title: "Niche Finder, AI Studio" }] }),
});

type RecProduct = { id: string; name: string; image_url: string | null; cost_price: number; sell_price: number; category: string };
type Niche = {
  rank: number;
  name: string;
  fit: string;
  category: string;
  adAngle: string;
  risk: string;
  riskLevel: "low" | "medium" | "high";
  products: RecProduct[];
};

const RISK_CLS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-red-500/15 text-red-300",
};

function NicheFinder() {
  const [interests, setInterests] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [niches, setNiches] = useState<Niche[] | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!interests.trim()) {
      setErr("Tell us what you're into or who you'd sell to.");
      return;
    }
    setBusy(true);
    setNiches(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch("/api/tools/niche-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ interests }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; niches?: Niche[] };
      if (!data.ok) {
        setErr(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setNiches(data.niches ?? []);
    } catch {
      setErr("Couldn't reach the niche finder. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]">
        <ArrowLeft className="h-4 w-4" /> AI Studio
      </Link>

      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
          <Flame className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Niche Finder</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Tell us what you&apos;re into. We&apos;ll suggest 3 niches that work in SA and match them to real products in your catalogue.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          Your interests, audience or budget
        </label>
        <textarea
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          rows={3}
          placeholder="e.g. I want to sell to young moms, budget R2000 to start, into home + baby products"
          className="w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]"
        />
        {err && (
          <div className="mt-3 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "Finding your niches…" : "Find my niches"}
        </button>
      </form>

      {busy && (
        <div className="grid place-items-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">Analysing the SA market + your catalogue…</p>
        </div>
      )}

      {niches && niches.length > 0 && (
        <div className="space-y-5">
          {niches.map((n) => (
            <div key={n.rank} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 glow-card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--primary)] text-sm font-bold text-white">{n.rank}</span>
                <h2 className="text-lg font-bold text-white">{n.name}</h2>
                <span className="rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--primary)]">{n.category}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${RISK_CLS[n.riskLevel] ?? RISK_CLS.medium}`}>{n.riskLevel} risk</span>
              </div>
              <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{n.fit}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm text-white"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--primary)]" /> <span><span className="text-[color:var(--muted-foreground)]">Ad angle: </span>{n.adAngle}</span></div>
                <div className="flex items-start gap-2 text-sm text-white"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> <span><span className="text-[color:var(--muted-foreground)]">Watch out: </span>{n.risk}</span></div>
              </div>

              {n.products.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Recommended from your catalogue</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {n.products.map((p) => {
                      const profit = Number(p.sell_price) - Number(p.cost_price);
                      return (
                        <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group flex gap-3 rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-2.5 transition-colors hover:border-[color:var(--primary)]">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center text-white/30"><Package className="h-5 w-5" /></div>}
                          </div>
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-xs font-medium text-white group-hover:text-[color:var(--primary)]">{p.name}</div>
                            <div className="mt-1 text-xs text-white">{fmtZAR(p.cost_price)} <span className="text-[color:var(--muted-foreground)]">cost</span></div>
                            <div className="text-[11px] font-semibold text-emerald-300">{fmtZAR(profit)} profit</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
