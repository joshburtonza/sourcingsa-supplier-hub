import { ArrowUpRight } from "lucide-react";

function StatBox({ label, value, sub, subClass = "text-[#22c55e]" }: {
  label: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-black/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      <div className={`mt-0.5 text-xs ${subClass}`}>{sub}</div>
    </div>
  );
}

function AreaChart() {
  const points = "0,90 10,82 20,86 30,70 40,75 50,58 60,62 70,40 80,42 90,22 100,18";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full">
      <defs>
        <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#areaG)" points={`${points} 100,100 0,100`} />
      <polyline fill="none" stroke="#22c55e" strokeWidth="1.2" points={points} />
    </svg>
  );
}

export function SalesPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[#050505] p-5">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
            Vault · Sales Overview
          </div>
          <span className="text-[11px] text-[color:var(--muted-foreground)]">Today · Live</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatBox label="Total Revenue" value="R284K" sub="+514%" />
          <StatBox label="Orders" value="1,316" sub="+679%" />
          <StatBox label="Avg Order" value="R993" sub="Your margin" subClass="text-[color:var(--muted-foreground)]" />
        </div>

        <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Revenue Over Time
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">R1,470,847</span>
                <span className="text-xs font-semibold text-[#22c55e]">+494%</span>
              </div>
            </div>
            <div className="flex gap-1">
              {["7D", "30D", "90D"].map((t, i) => (
                <span key={t}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                    i === 1
                      ? "bg-[color:var(--primary)] text-black"
                      : "bg-[#0A0A0A] text-[color:var(--muted-foreground)]"
                  }`}>{t}</span>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <AreaChart />
          </div>
        </div>
      </div>
    </div>
  );
}

const ORDERS = [
  { city: "Johannesburg", amount: "R1,289", status: "Delivered", green: true },
  { city: "Cape Town", amount: "R849", status: "In transit", green: false },
  { city: "Durban", amount: "R2,140", status: "Delivered", green: true },
];

const TOP_PRODS = [
  { sales: "3.4K", w: 92 },
  { sales: "2.8K", w: 75 },
  { sales: "2.1K", w: 58 },
  { sales: "1.6K", w: 45 },
];

export function FulfilmentPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[#050505] p-5">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
            Vault · Live Order Feed
          </div>
          <span className="text-[11px] text-[#22c55e]">47 active today</span>
        </div>

        <div className="mt-4 space-y-2">
          {ORDERS.map((o, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-black/40 p-3">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{o.city}</div>
                <div className="text-[11px] text-[color:var(--muted-foreground)]">Order #482{i}1</div>
              </div>
              <div className="text-sm font-semibold text-white">{o.amount}</div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                o.green
                  ? "bg-[#22c55e]/15 text-[#22c55e]"
                  : "bg-[#f59e0b]/15 text-[#f59e0b]"
              }`}>{o.status}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Top Performing Products This Week
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TOP_PRODS.map((p, i) => (
              <div key={i} className="rounded-lg border border-[color:var(--border)] bg-black/40 p-3">
                <div className="h-2 w-3/4 rounded bg-white/10 blur-[2px]" />
                <div className="mt-3 h-1.5 w-full rounded-full bg-[color:var(--border)] overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--primary)]" style={{ width: `${p.w}%` }} />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-[color:var(--muted-foreground)]">sales</span>
                  <span className="text-sm font-bold text-white">{p.sales}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
