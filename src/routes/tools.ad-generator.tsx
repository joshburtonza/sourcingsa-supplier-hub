import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Megaphone, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";

export const Route = createFileRoute("/tools/ad-generator")({
  component: () => (
    <ProtectedShell>
      <AdGenerator />
    </ProtectedShell>
  ),
  head: () => ({ meta: [{ title: "Ad Generator, AI Studio" }] }),
});

type Script = { platform: string; hook: string; body: string; cta: string; overlays: string[] };
type Ads = { product: string; audience: string; scripts: Script[] };

function AdGenerator() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ads, setAds] = useState<Ads | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!input.trim()) {
      setErr("Describe the product you want ads for.");
      return;
    }
    setBusy(true);
    setAds(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/tools/ai-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ tool: "ad_generator", input }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; result?: Ads };
      if (!data.ok || !data.result) {
        setErr(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setAds(data.result);
    } catch {
      setErr("Couldn't reach the ad generator. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"><ArrowLeft className="h-4 w-4" /> AI Studio</Link>
      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]"><Megaphone className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold text-white">Ad Generator</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">TikTok, Reels and Meta ad scripts with hooks and on-screen overlays.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Product (and audience, if you have one)</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="e.g. LED face mask for skincare, target women 20-40"
          className="w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]" />
        {err && <div className="mt-3 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}
        <button type="submit" disabled={busy} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
          <Sparkles className="h-4 w-4" />{busy ? "Writing ads…" : "Generate ads"}
        </button>
      </form>

      {busy && <div className="grid place-items-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>}

      {ads && (
        <div className="space-y-4">
          {ads.audience && <p className="text-sm text-[color:var(--muted-foreground)]">Audience: <span className="text-white">{ads.audience}</span></p>}
          <div className="grid gap-4 lg:grid-cols-3">
            {ads.scripts.map((s) => (
              <div key={s.platform} className="flex flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 glow-card">
                <span className="inline-flex w-fit rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--primary)]">{s.platform}</span>
                <div className="mt-3 text-base font-bold text-white">{s.hook}</div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{s.body}</p>
                {s.overlays?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">On-screen text</div>
                    <ul className="mt-1.5 space-y-1">
                      {s.overlays.map((o, i) => <li key={i} className="text-xs text-white">• {o}</li>)}
                    </ul>
                  </div>
                )}
                <div className="mt-auto pt-4 text-sm font-semibold text-[color:var(--primary)]">{s.cta}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
