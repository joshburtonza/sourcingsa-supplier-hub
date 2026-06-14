import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { getAccessToken } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";

export const Route = createFileRoute("/tools/product-validator")({
  component: () => (
    <ProtectedShell>
      <ProductValidator />
    </ProtectedShell>
  ),
  head: () => ({ meta: [{ title: "Product Validator, AI Studio" }] }),
});

type Criterion = { name: string; score: number; note: string };
type Category = { name: string; criteria: Criterion[] };
type Scorecard = { productName: string; context?: string; categories: Category[]; overall: number; verdict: string; topActions: string[] };

function scoreCls(s: number) {
  if (s >= 7) return "text-emerald-300";
  if (s >= 4) return "text-amber-300";
  return "text-red-300";
}

function ProductValidator() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [card, setCard] = useState<Scorecard | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!input.trim()) {
      setErr("Paste a product name, description or link.");
      return;
    }
    setBusy(true);
    setCard(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/tools/ai-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ tool: "product_validator", input }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; result?: Scorecard };
      if (!data.ok || !data.result) {
        setErr(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setCard(data.result);
    } catch {
      setErr("Couldn't reach the validator. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"><ArrowLeft className="h-4 w-4" /> AI Studio</Link>
      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]"><CheckCircle2 className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold text-white">Product Validator</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Score any product across 24 dropshipping criteria before you commit.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Product name, description or link</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="e.g. Posture corrector brace, R79 cost, for office workers"
          className="w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]" />
        {err && <div className="mt-3 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}
        <button type="submit" disabled={busy} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
          <Sparkles className="h-4 w-4" />{busy ? "Scoring…" : "Validate product"}
        </button>
      </form>

      {busy && <div className="grid place-items-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>}

      {card && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{card.productName}</h2>
                {card.context && <p className="text-sm text-[color:var(--muted-foreground)]">{card.context}</p>}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${scoreCls(card.overall)}`}>{card.overall}<span className="text-lg text-[color:var(--muted-foreground)]">/10</span></div>
              </div>
            </div>
            <p className="mt-3 text-sm text-white">{card.verdict}</p>
            {card.topActions?.length > 0 && (
              <ul className="mt-4 space-y-2">
                {card.topActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--primary)]/20 text-[11px] font-bold text-[color:var(--primary)]">{i + 1}</span>{a}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {card.categories.map((cat) => {
              const avg = Math.round((cat.criteria.reduce((s, c) => s + Number(c.score), 0) / cat.criteria.length) * 10) / 10;
              return (
                <div key={cat.name} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">{cat.name}</h3>
                    <span className={`text-sm font-bold ${scoreCls(avg)}`}>{avg}/10</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {cat.criteria.map((c) => (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">{c.name}</span>
                          <span className={`font-semibold ${scoreCls(Number(c.score))}`}>{c.score}</span>
                        </div>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{c.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
