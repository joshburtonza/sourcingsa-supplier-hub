import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { fmtZAR, shortId, STATUS_META, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/admin/orders")({
  component: () => (
    <AdminShell>
      <AdminOrders />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
});

type Order = {
  id: string;
  email: string;
  product_name: string;
  quantity: number;
  amount: number;
  paid: boolean;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  tracking_number: string | null;
  courier: string | null;
  notes: string | null;
  ordered_at: string;
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("orders").select("*").order("ordered_at", { ascending: false });
    if (error) console.error("[admin/orders] load failed", error.message);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const okF = filter === "all" || o.status === filter;
        const okS =
          !search ||
          o.product_name.toLowerCase().includes(search.toLowerCase()) ||
          o.email.toLowerCase().includes(search.toLowerCase()) ||
          (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          o.id.toLowerCase().includes(search.toLowerCase());
        return okF && okS;
      }),
    [orders, filter, search],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Update status, mark paid, and add tracking. Members see changes live.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")} className={chip(filter === "all")}>All</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>{STATUS_META[s].label}</button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, member, customer, ID…" className="input focus-glow pl-11" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">No orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const meta = STATUS_META[o.status];
                  return (
                    <tr key={o.id} onClick={() => setEditing(o)} className="cursor-pointer border-t border-[color:var(--border)] hover:bg-white/[0.03]">
                      <td className="px-5 py-3 font-mono text-xs text-[color:var(--muted-foreground)]">{shortId(o.id)}</td>
                      <td className="px-5 py-3 text-[color:var(--muted-foreground)]">{o.email}</td>
                      <td className="px-5 py-3 text-white">{o.product_name}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</td>
                      <td className="px-5 py-3 text-white">{fmtZAR(o.amount)}</td>
                      <td className="px-5 py-3">{o.paid ? <span className="text-emerald-300">Yes</span> : <span className="text-amber-300">No</span>}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <OrderEditor order={editing} onClose={() => setEditing(null)} onSaved={(u) => { setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o))); setEditing(null); }} />}
    </div>
  );
}

function OrderEditor({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: (o: Order) => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paid, setPaid] = useState(order.paid);
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const patch = {
      status,
      paid,
      courier: courier.trim() || null,
      tracking_number: tracking.trim() || null,
    };
    const { data, error } = await supabase.from("orders").update(patch).eq("id", order.id).select("*").single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(data as Order);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        <div className="font-mono text-xs text-[color:var(--muted-foreground)]">{shortId(order.id)}</div>
        <h2 className="mt-1 text-xl font-semibold text-white">{order.product_name}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{order.email} · {fmtZAR(order.amount)}</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Status</span>
            <select className="input focus-glow" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s} className="bg-[color:var(--card)]">{STATUS_META[s].label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" />
            <span className="text-sm text-white">Payment received</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Courier</span>
            <input className="input focus-glow" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. The Courier Guy" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Tracking number</span>
            <input className="input focus-glow" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking #" />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-4 text-sm">
          <div className="font-semibold text-white">Ship to</div>
          <div className="mt-1 text-[color:var(--muted-foreground)]">
            <div className="text-white">{order.customer_name ?? "—"}</div>
            {order.customer_phone && <div>{order.customer_phone}</div>}
            {order.shipping_address && <div>{order.shipping_address}</div>}
            <div>{[order.shipping_city, order.shipping_province, order.shipping_postal_code].filter(Boolean).join(", ")}</div>
            {order.notes && <div className="mt-2 italic">“{order.notes}”</div>}
          </div>
        </div>

        {err && <div className="mt-4 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}

        <button onClick={save} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return `rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "border-[color:var(--primary)] bg-[color:var(--primary)]/15 text-[color:var(--primary)]" : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-white"}`;
}
