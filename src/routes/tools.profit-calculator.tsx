import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, ArrowLeft } from "lucide-react";
import { ProtectedShell } from "@/components/ProtectedShell";
import { fmtZAR } from "@/lib/orders";

export const Route = createFileRoute("/tools/profit-calculator")({
  component: () => (
    <ProtectedShell>
      <ProfitCalculator />
    </ProtectedShell>
  ),
  head: () => ({ meta: [{ title: "Profit Calculator, AI Studio" }] }),
});

function Field({ label, value, onChange, prefix = "R" }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</span>
      <div className="flex items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] focus-within:border-[color:var(--primary)]">
        <span className="pl-3 text-sm text-[color:var(--muted-foreground)]">{prefix}</span>
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0"
          className="w-full bg-transparent px-2 py-2.5 text-sm text-white outline-none" />
      </div>
    </label>
  );
}

function Stat({ label, value, tone = "text-white", sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{sub}</div>}
    </div>
  );
}

function ProfitCalculator() {
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  const [cpa, setCpa] = useState("");
  const [orders, setOrders] = useState("");

  const r = useMemo(() => {
    const c = Number(cost) || 0;
    const s = Number(sell) || 0;
    const a = Number(cpa) || 0;
    const o = Number(orders) || 0;
    const grossProfit = s - c;
    const netProfit = s - c - a;
    const grossMargin = s > 0 ? (grossProfit / s) * 100 : 0;
    const netMargin = s > 0 ? (netProfit / s) * 100 : 0;
    const breakevenCpa = grossProfit; // max ad spend per sale before you lose money
    const breakevenRoas = grossProfit > 0 ? s / grossProfit : 0; // revenue per R1 ad spend to break even
    const monthlyProfit = netProfit * o;
    return { grossProfit, netProfit, grossMargin, netMargin, breakevenCpa, breakevenRoas, monthlyProfit, hasAds: a > 0, hasOrders: o > 0 };
  }, [cost, sell, cpa, orders]);

  const ready = Number(sell) > 0 && Number(cost) > 0;

  return (
    <div className="space-y-6">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"><ArrowLeft className="h-4 w-4" /> AI Studio</Link>
      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]"><Calculator className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold text-white">Profit Calculator</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Margins, breakeven ad spend and projected profit on any product.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Your cost" value={cost} onChange={setCost} />
          <Field label="Sell price" value={sell} onChange={setSell} />
          <Field label="Ad cost / sale" value={cpa} onChange={setCpa} />
          <Field label="Orders / month" value={orders} onChange={setOrders} prefix="#" />
        </div>
      </div>

      {ready && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Profit per sale" value={fmtZAR(r.hasAds ? r.netProfit : r.grossProfit)} tone={(r.hasAds ? r.netProfit : r.grossProfit) >= 0 ? "text-emerald-300" : "text-red-300"} sub={r.hasAds ? "after ad cost" : "before ads"} />
          <Stat label="Gross margin" value={`${r.grossMargin.toFixed(0)}%`} sub={`${fmtZAR(r.grossProfit)} per sale`} />
          {r.hasAds && <Stat label="Net margin" value={`${r.netMargin.toFixed(0)}%`} tone={r.netMargin >= 0 ? "text-white" : "text-red-300"} sub="after ads" />}
          <Stat label="Breakeven ad spend" value={fmtZAR(r.breakevenCpa)} sub="max per sale before loss" />
          <Stat label="Breakeven ROAS" value={`${r.breakevenRoas.toFixed(2)}x`} sub="revenue per R1 of ads" />
          {r.hasOrders && <Stat label="Monthly profit" value={fmtZAR(r.monthlyProfit)} tone={r.monthlyProfit >= 0 ? "text-emerald-300" : "text-red-300"} sub={`at ${orders} orders/mo`} />}
        </div>
      )}
      {!ready && <p className="text-sm text-[color:var(--muted-foreground)]">Enter your cost and sell price to see the numbers.</p>}
    </div>
  );
}
