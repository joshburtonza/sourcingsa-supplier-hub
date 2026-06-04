import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Wallet,
  Truck,
  CheckCircle2,
  Clock,
  CalendarDays,
  Search,
  Flame,
  PlusCircle,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import { ProductCard, type Product } from "@/components/ProductCard";
import { fmtZAR, shortId, STATUS_META, type OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Dashboard, Members" },
      { name: "description", content: "Your member dashboard." },
    ],
  }),
});

type Order = {
  id: string;
  product_name: string;
  quantity: number;
  amount: number;
  paid: boolean;
  status: OrderStatus;
  ordered_at: string;
};

const CARD_COLS =
  "id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,description,stock_status,sales_count,trending";

function Dashboard() {
  const { user } = useAuth();
  const email = user?.email;
  const [orders, setOrders] = useState<Order[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [catalogueCount, setCatalogueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const [ordRes, trendRes, countRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, product_name, quantity, amount, paid, status, ordered_at")
          .order("ordered_at", { ascending: false }),
        supabase
          .from("products")
          .select(CARD_COLS)
          .eq("active", true)
          .eq("trending", true)
          .order("sales_count", { ascending: false })
          .limit(6),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
      ]);
      if (ordRes.error) console.error("[dashboard] orders load failed", ordRes.error.message);
      if (trendRes.error) console.error("[dashboard] trending load failed", trendRes.error.message);
      setOrders((ordRes.data as Order[]) ?? []);
      setTrending((trendRes.data as Product[]) ?? []);
      setCatalogueCount(countRes.count ?? null);
      setLoading(false);
    })();
  }, [email]);

  const stats = useMemo(() => {
    const total = orders.length;
    const spent = orders.reduce((s, o) => s + Number(o.amount), 0);
    const transit = orders.filter((o) => o.status === "in_transit").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const awaiting = orders.filter((o) => !o.paid && o.status !== "cancelled").length;
    return { total, spent, transit, delivered, awaiting };
  }, [orders]);

  const name = (email ?? "Member").split("@")[0];
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
    : "-";
  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(107,79,232,0.35) 0%, transparent 70%)" }} />
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome back, <span className="text-[color:var(--primary)]">{name}</span>
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Here&apos;s an overview of your activity.
          {catalogueCount ? <> · <span className="text-white">{catalogueCount} products</span> ready to sell.</> : null}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Package />} label="Total Orders" value={stats.total} />
        <StatCard icon={<Wallet />} label="Total Spent" value={fmtZAR(stats.spent)} />
        <StatCard icon={<Clock />} label="Awaiting Payment" value={stats.awaiting} />
        <StatCard icon={<Truck />} label="In Transit" value={stats.transit} />
        <StatCard icon={<CheckCircle2 />} label="Delivered" value={stats.delivered} />
        <StatCard icon={<CalendarDays />} label="Member Since" value={memberSince} />
      </section>

      {trending.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Flame className="h-5 w-5 text-[color:var(--primary)]" /> Trending this week
            </h2>
            <Link to="/trending" className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <Link to="/orders" className="text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">View all</Link>
        </div>
        {loading ? (
          <div className="grid place-items-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[color:var(--muted-foreground)]">No orders yet. Pick a trending product above or browse the full catalogue to start selling.</p>
            <Link to="/products" className="mt-4 inline-block rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">Browse the catalogue</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => {
                  const meta = STATUS_META[o.status];
                  return (
                    <tr key={o.id} className="border-t border-[color:var(--border)]">
                      <td className="px-6 py-3 font-mono text-xs text-[color:var(--muted-foreground)]">{shortId(o.id)}</td>
                      <td className="px-6 py-3 text-white">{o.product_name}{o.quantity > 1 ? <span className="text-[color:var(--muted-foreground)]"> ×{o.quantity}</span> : null}</td>
                      <td className="px-6 py-3 text-[color:var(--muted-foreground)]">{new Date(o.ordered_at).toLocaleDateString("en-ZA")}</td>
                      <td className="px-6 py-3 text-white">{fmtZAR(Number(o.amount))}</td>
                      <td className="px-6 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 glow-card-hover">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</div>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm font-medium text-white transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </Link>
  );
}
