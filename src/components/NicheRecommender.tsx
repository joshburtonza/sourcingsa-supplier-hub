import { useState, type FormEvent } from "react";
import { Sparkles, TrendingUp, AlertTriangle, X } from "lucide-react";
import { getAccessToken } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";

type Niche = { name: string; fit: string; category: string; adAngle: string; risk: string; riskLevel: "low" | "medium" | "high" };
type Result = { niche: Niche; products: Product[]; count: number; tier: string | null };

const RISK_CLS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-red-500/15 text-red-300",
};

/** "Recommend a niche + products for my package" — sits at the top of the
 *  Find Products page. Picks one niche + N catalogue products sized to the
 *  member's package tier. */
export function NicheRecommender() {
  const [interests, setInterests] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function recommend(e?: FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    setResult(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/tools/recommend-niche", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ interests: interests.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string } & Partial<Result>;
      if (!data.ok || !data.niche) {
        setErr(data.error ?? "Couldn't generate a recommendation. Try again.");
        return;
      }
      setResult(data as Result);
    } catch {
      setErr("Couldn't reach the recommender. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/[0.06] p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/20 text-[color:var(--primary)]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-white">Not sure what to sell?</h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">Tell the AI a niche, or leave it blank and we&apos;ll pick one for your package.</p>
        </div>
      </div>
      <form onSubmit={recommend} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="e.g. fitness gear, baby products, phone accessories (optional)"
          className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "Picking…" : "Recommend my niche"}
        </button>
      </form>

      {busy && (
        <div className="mt-5 grid place-items-center py-6">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Analysing the SA market + your catalogue…</p>
        </div>
      )}

      {err && <div className="mt-4 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}

      {result && (
        <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{result.niche.name}</h3>
              <span className="rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--primary)]">{result.niche.category}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${RISK_CLS[result.niche.riskLevel] ?? RISK_CLS.medium}`}>{result.niche.riskLevel} risk</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                {result.count} products{result.tier ? ` · ${result.tier}` : ""}
              </span>
            </div>
            <button onClick={() => setResult(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:text-white" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{result.niche.fit}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm text-white"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--primary)]" /><span><span className="text-[color:var(--muted-foreground)]">Ad angle: </span>{result.niche.adAngle}</span></div>
            <div className="flex items-start gap-2 text-sm text-white"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span><span className="text-[color:var(--muted-foreground)]">Watch out: </span>{result.niche.risk}</span></div>
          </div>

          {result.products.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Your starter product set</div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
