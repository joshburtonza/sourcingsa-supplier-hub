import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, ClipboardList, Inbox, LifeBuoy, Users, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminShell>
      <Overview />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Admin, ZA Supplier Hub" }] }),
});

type Counts = {
  products: number;
  orders: number;
  toShip: number;
  inTransit: number;
  openRequests: number;
  openTickets: number;
  members: number;
};

type CountTable = "products" | "orders" | "profiles" | "product_requests" | "support_tickets";

async function countOf(
  table: CountTable,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build?: (q: any) => any,
): Promise<number> {
  const base = supabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = await (build ? build(base) : base);
  if (error) console.error(`[admin] count ${table} failed`, error.message);
  return count ?? 0;
}

function Overview() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const [products, orders, toShip, inTransit, openRequests, openTickets, members] = await Promise.all([
        countOf("products"),
        countOf("orders"),
        countOf("orders", (q) => q.eq("status", "unfulfilled").eq("paid", true)),
        countOf("orders", (q) => q.eq("status", "in_transit")),
        countOf("product_requests", (q) => q.in("status", ["new", "sourcing"])),
        countOf("support_tickets", (q) => q.eq("status", "open")),
        countOf("profiles"),
      ]);
      setC({ products, orders, toShip, inTransit, openRequests, openTickets, members });
    })();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Run the hub, catalogue, orders, members and requests.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card to="/admin/orders" icon={<Truck />} label="Paid · ready to ship" value={c?.toShip} accent />
        <Card to="/admin/orders" icon={<ClipboardList />} label="In transit" value={c?.inTransit} />
        <Card to="/admin/requests" icon={<Inbox />} label="Open requests" value={c?.openRequests} accent={Boolean(c && c.openRequests > 0)} />
        <Card to="/admin/support" icon={<LifeBuoy />} label="Open tickets" value={c?.openTickets} accent={Boolean(c && c.openTickets > 0)} />
        <Card to="/admin/products" icon={<Boxes />} label="Products" value={c?.products} />
        <Card to="/admin/members" icon={<Users />} label="Members" value={c?.members} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Quick to="/admin/products" label="Manage catalogue" />
        <Quick to="/admin/orders" label="Fulfil orders" />
        <Quick to="/admin/requests" label="Answer requests" />
        <Quick to="/admin/members" label="Manage members" />
      </section>
    </div>
  );
}

function Card({ to, icon, label, value, accent }: { to: string; icon: React.ReactNode; label: string; value: number | undefined; accent?: boolean }) {
  return (
    <Link to={to} className={`rounded-xl border bg-[color:var(--card)] p-5 transition-colors hover:border-[color:var(--primary)] ${accent ? "border-[color:var(--primary)]/40" : "border-[color:var(--border)]"}`}>
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)] [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <div className="text-2xl font-semibold text-white">{value ?? "-"}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</div>
    </Link>
  );
}

function Quick({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-4 text-sm font-medium text-white transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]">
      {label} →
    </Link>
  );
}
