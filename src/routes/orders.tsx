import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Package, Truck, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import { fmtZAR, shortId, STATUS_META, type OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/orders")({
  component: () => (
    <ProtectedShell>
      <OrdersPage />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Orders, Members" },
      { name: "description", content: "All your orders in one place." },
    ],
  }),
});

type Order = {
  id: string;
  email: string;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_cost: number;
  amount: number;
  paid: boolean;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  tracking_number: string | null;
  courier: string | null;
  notes: string | null;
  ordered_at: string;
};

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "Total Orders" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "processing", label: "Processing" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const PERIODS = [
  { label: "All time", days: Infinity },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function OrdersPage() {
  const { email } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [periodIdx, setPeriodIdx] = useState(0);
  const [active, setActive] = useState<Order | null>(null);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("ordered_at", { ascending: false });
      if (error) console.error("[orders] load failed", error.message);
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [email]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const cutoff = PERIODS[periodIdx].days === Infinity ? 0 : Date.now() - PERIODS[periodIdx].days * 864e5;
    return orders.filter((o) => {
      const okFilter = filter === "all" || o.status === filter;
      const okSearch =
        !search ||
        o.product_name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase());
      const okPeriod = new Date(o.ordered_at).getTime() >= cutoff;
      return okFilter && okSearch && okPeriod;
    });
  }, [orders, filter, search, periodIdx]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Track every order you&apos;ve placed for your customers.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-xl border p-4 text-left transition-colors ${isActive ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10" : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--primary)]"}`}
            >
              <div className="text-2xl font-bold text-white">{counts[f.key] ?? 0}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">{f.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, customer or order ID…" className="input focus-glow pl-11" />
        </div>
        <select value={periodIdx} onChange={(e) => setPeriodIdx(Number(e.target.value))} className="input focus-glow sm:w-48">
          {PERIODS.map((p, i) => (
            <option key={p.label} value={i} className="bg-[color:var(--card)]">{p.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-[color:var(--muted-foreground)]" />
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">No orders yet.</p>
            <Link to="/products" className="mt-4 inline-block rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">Find products to sell</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const meta = STATUS_META[o.status];
                  return (
                    <tr key={o.id} onClick={() => setActive(o)} className="cursor-pointer border-t border-[color:var(--border)] transition-colors hover:bg-white/[0.03]">
                      <td className="px-6 py-3 font-mono text-xs text-[color:var(--muted-foreground)]">{shortId(o.id)}</td>
                      <td className="px-6 py-3 text-white">{o.product_name}{o.quantity > 1 ? <span className="text-[color:var(--muted-foreground)]"> ×{o.quantity}</span> : null}</td>
                      <td className="px-6 py-3 text-[color:var(--muted-foreground)]">{o.customer_name ?? "-"}</td>
                      <td className="px-6 py-3 text-[color:var(--muted-foreground)]">{new Date(o.ordered_at).toLocaleDateString("en-ZA")}</td>
                      <td className="px-6 py-3 text-white">{fmtZAR(Number(o.amount))}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                          {!o.paid && o.status !== "cancelled" && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">Awaiting payment</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active && <OrderDetail order={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const meta = STATUS_META[order.status];
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        <div className="font-mono text-xs text-[color:var(--muted-foreground)]">{shortId(order.id)}</div>
        <h2 className="mt-1 text-xl font-semibold text-white">{order.product_name}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
          {!order.paid && order.status !== "cancelled" && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">Awaiting payment</span>}
          {order.paid && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">Paid</span>}
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <Row label="Quantity" value={String(order.quantity)} />
          <Row label="Unit cost" value={fmtZAR(order.unit_cost)} />
          <Row label="Total" value={fmtZAR(order.amount)} strong />
          <Row label="Ordered" value={new Date(order.ordered_at).toLocaleString("en-ZA")} />
        </dl>

        {(order.tracking_number || order.courier) && (
          <div className="mt-6 rounded-xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Truck className="h-4 w-4 text-[color:var(--primary)]" /> Tracking</div>
            {order.courier && <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">{order.courier}</div>}
            {order.tracking_number && <div className="font-mono text-sm text-white">{order.tracking_number}</div>}
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><MapPin className="h-4 w-4 text-[color:var(--primary)]" /> Ship to</div>
          <div className="mt-2 space-y-0.5 text-sm text-[color:var(--muted-foreground)]">
            <div className="text-white">{order.customer_name ?? "-"}</div>
            {order.customer_phone && <div>{order.customer_phone}</div>}
            {order.shipping_address && <div>{order.shipping_address}</div>}
            <div>{[order.shipping_city, order.shipping_province, order.shipping_postal_code].filter(Boolean).join(", ") || ""}</div>
          </div>
        </div>

        {order.notes && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-white">Notes</div>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={strong ? "text-base font-bold text-white" : "text-white"}>{value}</dd>
    </div>
  );
}
