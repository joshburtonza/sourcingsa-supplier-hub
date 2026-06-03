import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/support")({
  component: () => (
    <AdminShell>
      <AdminSupport />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Support, Admin" }] }),
});

type Ticket = {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

const STATUSES = ["open", "answered", "closed"];
const STATUS_CLS: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-300",
  answered: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-zinc-500/15 text-zinc-400",
};

function AdminSupport() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ticket | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) console.error("[admin/support] load failed", error.message);
    setRows((data as Ticket[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Support Tickets</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Reply to members and close out tickets.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {rows.map((t) => (
              <li key={t.id} onClick={() => setEditing(t)} className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{t.subject}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)]">{t.email} · {new Date(t.created_at).toLocaleDateString("en-ZA")}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLS[t.status] ?? STATUS_CLS.open}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <TicketEditor ticket={editing} onClose={() => setEditing(null)} onSaved={(u) => { setRows((p) => p.map((x) => (x.id === u.id ? u : x))); setEditing(null); }} />}
    </div>
  );
}

function TicketEditor({ ticket, onClose, onSaved }: { ticket: Ticket; onClose: () => void; onSaved: (t: Ticket) => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [reply, setReply] = useState(ticket.admin_reply ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    // Replying implicitly marks it answered unless the admin chose otherwise.
    const nextStatus = reply.trim() && status === "open" ? "answered" : status;
    const { data, error } = await supabase
      .from("support_tickets")
      .update({ status: nextStatus, admin_reply: reply.trim() || null })
      .eq("id", ticket.id)
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(data as Ticket);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="text-xl font-semibold text-white">{ticket.subject}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{ticket.email}</p>
        <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm text-[color:var(--muted-foreground)] whitespace-pre-wrap">{ticket.message}</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Status</span>
            <select className="input focus-glow" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s} className="bg-[color:var(--card)]">{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Reply</span>
            <textarea className="input focus-glow min-h-[120px] resize-y" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Shown to the member on their support page" />
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
