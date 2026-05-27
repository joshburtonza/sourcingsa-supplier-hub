import { ArrowUpRight } from "lucide-react";

function StatBox({ label, value, sub, subClass = "text-[#7B5EE8]" }: {
  label: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1F1F1F] bg-black/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">{label}</div>
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
          <stop offset="0%" stopColor="#7B5EE8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7B5EE8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#areaG)" points={`${points} 100,100 0,100`} />
      <polyline fill="none" stroke="#7B5EE8" strokeWidth="1.2" points={points} />
    </svg>
  );
}

export function SalesPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7B5EE8]" />
            Vault · Sales Overview
          </div>
          <span className="rounded-full bg-[#7B5EE8]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7B5EE8]">Today · Live</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatBox label="Total Revenue" value="R284K" sub="+514%" />
          <StatBox label="Orders" value="1,316" sub="+679%" />
          <StatBox label="Avg Order" value="R993" sub="Your margin" subClass="text-[#A1A1AA]" />
        </div>

        <div className="mt-5 rounded-xl border border-[#1F1F1F] bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Revenue Over Time
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">R1,470,847</span>
                <span className="text-xs font-semibold text-[#7B5EE8]">+494%</span>
              </div>
            </div>
            <div className="flex gap-1">
              {["7D", "30D", "90D"].map((t, i) => (
                <span key={t}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                    i === 1
                      ? "bg-[#7B5EE8] text-white"
                      : "bg-[#0A0A0A] text-[#A1A1AA] border border-[#1F1F1F]"
                  }`}>{t}</span>
              ))}
            </div>
          </div>
          <div className="mt-3"><AreaChart /></div>
        </div>
      </div>
    </div>
  );
}

const ORDERS = [
  { city: "Johannesburg", id: "48201", amount: "R1,289", status: "Delivered", purple: true },
  { city: "Cape Town", id: "48211", amount: "R849", status: "In transit", purple: false },
  { city: "Durban", id: "48221", amount: "R2,140", status: "Delivered", purple: true },
];

const TOP_PRODS = ["3.4K", "2.8K", "2.1K", "1.6K"];

export function FulfilmentPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7B5EE8]" />
            Vault · Live Order Feed
          </div>
          <span className="text-[11px] text-[#7B5EE8]">47 active today</span>
        </div>

        <div className="mt-4 space-y-2">
          {ORDERS.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-lg border border-[#1F1F1F] bg-black/40 p-3">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[#7B5EE8]/15 text-[#7B5EE8]">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{o.city}</div>
                <div className="text-[11px] text-[#A1A1AA]">Order #{o.id}</div>
              </div>
              <div className="text-sm font-semibold text-white">{o.amount}</div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                o.purple
                  ? "bg-[#7B5EE8] text-white"
                  : "bg-[#1F1F1F] text-[#A1A1AA]"
              }`}>{o.status}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Top Performing Products This Week
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TOP_PRODS.map((sales, i) => (
              <div key={i} className="rounded-lg border border-[#1F1F1F] bg-black/40 p-2">
                <div className="aspect-square rounded-md bg-[#111111] backdrop-blur-md relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg opacity-50" />
                </div>
                <div className="mt-2 text-center text-xs font-bold text-white">{sales}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
