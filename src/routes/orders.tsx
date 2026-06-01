import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import { fmtZAR } from "@/components/ProductCard";

export const Route = createFileRoute("/orders")({
  component: () => (
    <ProtectedShell>
      <OrdersPage />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Orders — Members" },
      { name: "description", content: "All your orders in one place." },
    ],
  }),
});

type Status = "unfulfilled" | "processing" | "in_transit" | "delivered" | "cancelled";
type Order = {
  id: string;
  email: string;
  product_name: string;
  amount: number;
  status: Status;
  ordered_at: string;
};

const FILTERS: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "Total Orders" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "processing", label: "Processing" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABEL: Record<Status, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_CLS: Record<Status, string> = {
  unfulfilled: "bg-red-500/15 text-red-400",
  processing: "bg-orange-500/15 text-orange-400",
  in_transit: "bg-[color:var(--primary)]/15 text-[color:var(--primary)]",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
};

const PERIODS = [
  { label: "All time", days: Infinity },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function OrdersPage() {
  const { user } = useAuth();
  const email = user?.email;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [periodIdx, setPeriodIdx] = useState(0);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("email", email)
        .order("ordered_at", { ascending: false });
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
    const cutoff =
      PERIODS[periodIdx].days === Infinity
        ? 0
        : Date.now() - PERIODS[periodIdx].days * 24 * 60 * 60 * 1000;
    return orders.filter((o) => {
      const okFilter = filter === "all" || o.status === filter;
      const okSearch =
        !search || o.product_name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      const okPeriod = new Date(o.ordered_at).getTime() >= cutoff;
      return okFilter && okSearch && okPeriod;
    });
  }, [orders, filter, search, periodIdx]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Track and manage every order you've placed.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10"
                  : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--primary)]"
              }`}
            >
              <div className="text-2xl font-bold text-white">{counts[f.key] ?? 0}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                {f.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="input focus-glow pl-11"
          />
        </div>
        <select
          value={periodIdx}
          onChange={(e) => setPeriodIdx(Number(e.target.value))}
          className="input focus-glow sm:w-48"
        >
          {PERIODS.map((p, i) => (
            <option key={p.label} value={i} className="bg-[color:var(--card)]">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">
            No orders yet. Start by finding products to sell.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Date Ordered</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-[color:var(--border)]">
                    <td className="px-6 py-3 font-mono text-xs text-[color:var(--muted-foreground)]">
                      #{o.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 text-white">{o.product_name}</td>
                    <td className="px-6 py-3 text-[color:var(--muted-foreground)]">
                      {new Date(o.ordered_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="px-6 py-3 text-white">{fmtZAR(Number(o.amount))}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
