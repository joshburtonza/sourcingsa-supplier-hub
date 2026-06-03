import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Loader2, Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { fmtZAR } from "@/lib/orders";

export const Route = createFileRoute("/admin/requests")({
  component: () => (
    <AdminShell>
      <AdminRequests />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Requests — Admin" }] }),
});

type Req = {
  id: string;
  requester_email: string;
  product_name: string;
  product_url: string | null;
  notes: string | null;
  status: string;
  quote_cost: number | null;
  quote_sell: number | null;
  admin_reply: string | null;
  created_at: string;
};

const STATUSES = ["new", "sourcing", "quoted", "closed"];
const STATUS_CLS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-300",
  sourcing: "bg-amber-500/15 text-amber-300",
  quoted: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-zinc-500/15 text-zinc-400",
};

function AdminRequests() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Req | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("product_requests").select("*").order("created_at", { ascending: false });
    if (error) console.error("[admin/requests] load failed", error.message);
    setRows((data as Req[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Product Requests</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Source, quote and close member requests.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">No requests yet.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {rows.map((r) => (
              <li key={r.id} onClick={() => setEditing(r)} className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{r.product_name}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)]">{r.requester_email} · {new Date(r.created_at).toLocaleDateString("en-ZA")}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLS[r.status] ?? STATUS_CLS.new}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <RequestEditor req={editing} onClose={() => setEditing(null)} onSaved={(u) => { setRows((p) => p.map((x) => (x.id === u.id ? u : x))); setEditing(null); }} />}
    </div>
  );
}

function RequestEditor({ req, onClose, onSaved }: { req: Req; onClose: () => void; onSaved: (r: Req) => void }) {
  const [status, setStatus] = useState(req.status);
  const [cost, setCost] = useState(req.quote_cost != null ? String(req.quote_cost) : "");
  const [sell, setSell] = useState(req.quote_sell != null ? String(req.quote_sell) : "");
  const [reply, setReply] = useState(req.admin_reply ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const patch = {
      status,
      quote_cost: cost.trim() ? Number(cost) : null,
      quote_sell: sell.trim() ? Number(sell) : null,
      admin_reply: reply.trim() || null,
    };
    const { data, error } = await supabase.from("product_requests").update(patch).eq("id", req.id).select("*").single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(data as Req);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="text-xl font-semibold text-white">{req.product_name}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{req.requester_email}</p>
        {req.product_url && (
          <a href={req.product_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            <ExternalLink className="h-4 w-4" /> Reference link
          </a>
        )}
        {req.notes && <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm text-[color:var(--muted-foreground)]">{req.notes}</p>}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Status</span>
            <select className="input focus-glow" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s} className="bg-[color:var(--card)]">{s}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Quote cost (R)</span>
              <input className="input focus-glow" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Suggested sell (R)</span>
              <input className="input focus-glow" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} />
            </label>
          </div>
          {cost.trim() && sell.trim() && Number(sell) > Number(cost) && (
            <div className="text-xs text-[color:var(--muted-foreground)]">Margin: <span className="text-emerald-300">{fmtZAR(Number(sell) - Number(cost))}</span></div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Reply to member</span>
            <textarea className="input focus-glow min-h-[100px] resize-y" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Shown to the member on their requests page" />
          </label>
          {err && <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}
          <button onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
