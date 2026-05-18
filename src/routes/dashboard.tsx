import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Wallet,
  Truck,
  CheckCircle2,
  Star,
  CalendarDays,
  Search,
  Flame,
  PlusCircle,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import { fmtZAR } from "@/components/ProductCard";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Dashboard — Members" },
      { name: "description", content: "Your member dashboard." },
    ],
  }),
});

type Order = {
  id: string;
  email: string;
  product_name: string;
  category: string | null;
  amount: number;
  status: "unfulfilled" | "processing" | "in_transit" | "delivered" | "cancelled";
  ordered_at: string;
};

const STATUS_LABEL: Record<Order["status"], string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_CLS: Record<Order["status"], string> = {
  unfulfilled: "bg-red-500/15 text-red-400",
  processing: "bg-orange-500/15 text-orange-400",
  in_transit: "bg-[color:var(--primary)]/15 text-[color:var(--primary)]",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
};

function Dashboard() {
  const { user, session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("email", user.email)
        .order("ordered_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user?.email]);

  const stats = useMemo(() => {
    const total = orders.length;
    const spent = orders.reduce((s, o) => s + Number(o.amount), 0);
    const transit = orders.filter((o) => o.status === "in_transit").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (!o.category) return;
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    const fav =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { total, spent, transit, delivered, fav };
  }, [orders]);

  const name = (user?.email ?? "Member").split("@")[0];
  const memberSince = session
    ? new Date(session.verifiedAt).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome back, <span className="text-[color:var(--primary)]">{name}</span>
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Here's an overview of your activity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Package />} label="Total Orders Placed" value={stats.total} />
        <StatCard icon={<Wallet />} label="Total Spent" value={fmtZAR(stats.spent)} />
        <StatCard icon={<Truck />} label="Orders In Transit" value={stats.transit} />
        <StatCard icon={<CheckCircle2 />} label="Orders Delivered" value={stats.delivered} />
        <StatCard icon={<Star />} label="Favourite Category" value={stats.fav} />
        <StatCard icon={<CalendarDays />} label="Member Since" value={memberSince} />
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <Link
            to="/orders"
            className="text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid place-items-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          </div>
        ) : recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">
            No orders yet. Start by finding products to sell.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
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
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/products" icon={<Search />} label="Find Products" />
          <QuickLink to="/trending" icon={<Flame />} label="Trending Products" />
          <QuickLink to="/request-product" icon={<PlusCircle />} label="Request a Product" />
          <QuickLink to="/support" icon={<MessageCircle />} label="Contact Support" />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 glow-card-hover">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm font-medium text-white transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)] [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      {label}
    </Link>
  );
}
