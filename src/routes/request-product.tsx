import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { FileText, Search, Tag, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import { fmtZAR } from "@/lib/orders";

export const Route = createFileRoute("/request-product")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Request a Product, Members" },
      { name: "description", content: "Request a product and we'll source it." },
    ],
  }),
});

const STEPS = [
  { icon: FileText, title: "Send the product details", body: "Share a link, image, or description of the product you'd like to source." },
  { icon: Search, title: "We source & validate it", body: "Our team contacts trusted SA suppliers and confirms quality and stock within 48 hours." },
  { icon: Tag, title: "You get a quote", body: "Receive a clear quote, cost price, suggested sell price, and your margin." },
];

type RequestRow = {
  id: string;
  product_name: string;
  product_url: string | null;
  status: string;
  quote_cost: number | null;
  quote_sell: number | null;
  admin_reply: string | null;
  created_at: string;
};

const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Received", cls: "bg-blue-500/15 text-blue-300" },
  sourcing: { label: "Sourcing", cls: "bg-amber-500/15 text-amber-300" },
  quoted: { label: "Quoted", cls: "bg-emerald-500/15 text-emerald-300" },
  closed: { label: "Closed", cls: "bg-zinc-500/15 text-zinc-400" },
};

function Page() {
  const { email } = useAuth();
  const [form, setForm] = useState({ product_name: "", product_url: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [rows, setRows] = useState<RequestRow[]>([]);

  async function load() {
    if (!email) return;
    const { data, error } = await supabase
      .from("product_requests")
      .select("id, product_name, product_url, status, quote_cost, quote_sell, admin_reply, created_at")
      .order("created_at", { ascending: false });
    if (error) console.error("[requests] load failed", error.message);
    setRows((data as RequestRow[]) ?? []);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email) return;
    if (!form.product_name.trim()) {
      setErr("Tell us the product name or paste a link.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("product_requests").insert({
        requester_email: email.toLowerCase(),
        product_name: form.product_name.trim(),
        product_url: form.product_url.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setForm({ product_name: "", product_url: "", notes: "" });
      setDone(true);
      void load();
      setTimeout(() => setDone(false), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Request a Product</h1>
        <p className="mt-3 text-[color:var(--foreground)]">
          Can&apos;t find what you&apos;re looking for? We source products on request, send the
          details and we&apos;ll find the best local supplier and pricing for you.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card-hover">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-sm font-bold text-[color:var(--primary)]">{i + 1}</span>
              <s.icon className="h-5 w-5 text-[color:var(--primary)]" />
            </div>
            <h3 className="font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
          <h2 className="text-lg font-semibold text-white">Submit a request</h2>
          <div className="mt-5 space-y-4">
            <Field label="Product name or link *">
              <input className="input focus-glow" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} placeholder="e.g. Mini handheld fan" required />
            </Field>
            <Field label="Reference URL (TikTok, AliExpress, Google…)">
              <input className="input focus-glow" value={form.product_url} onChange={(e) => setForm((f) => ({ ...f, product_url: e.target.value }))} placeholder="https://…" />
            </Field>
            <Field label="Notes">
              <textarea className="input focus-glow min-h-[80px] resize-y" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Variants, target price, anything else" />
            </Field>
            {err && <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}
            {done && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Request received, we&apos;ll be in touch within 48 hours.
              </div>
            )}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
          <h2 className="text-lg font-semibold text-white">Your requests</h2>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">No requests yet. Submit your first one on the left.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((r) => {
                const st = REQ_STATUS[r.status] ?? REQ_STATUS.new;
                return (
                  <li key={r.id} className="rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-white">{r.product_name}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    {r.status === "quoted" && r.quote_cost != null && (
                      <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                        Quote: <span className="text-white">{fmtZAR(r.quote_cost)}</span> cost
                        {r.quote_sell != null && <> · sell {fmtZAR(r.quote_sell)}</>}
                      </div>
                    )}
                    {r.admin_reply && <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{r.admin_reply}</p>}
                    <div className="mt-2 text-xs text-[color:var(--muted-foreground)]">{new Date(r.created_at).toLocaleDateString("en-ZA")}</div>
                  </li>
                );
              })}
            </ul>
          )}
          <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            <MessageCircle className="h-4 w-4" /> Prefer WhatsApp? Message us
          </a>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</span>
      {children}
    </label>
  );
}
