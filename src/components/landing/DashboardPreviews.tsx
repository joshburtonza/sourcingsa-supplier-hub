import { ArrowUpRight } from "lucide-react";

function StatBox({ label, value, sub, subClass = "text-[#22c55e]" }: {
  label: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      <div className={`mt-0.5 text-xs ${subClass}`}>{sub}</div>
    </div>
  );
}

export function SalesPanel() {
  return (
    <div className="glass relative overflow-hidden p-5">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7B5EE8]" />
          Vault · Sales Overview
        </div>
        <span className="rounded-full bg-[rgba(107,79,232,0.2)] border border-[rgba(107,79,232,0.4)] px-2 py-0.5 text-[10px] font-semibold text-white">Today · Live</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatBox label="Total Revenue" value="R284K" sub="+514%" />
        <StatBox label="Orders" value="1,316" sub="+679%" />
        <StatBox label="Avg Order" value="R993" sub="Your margin" subClass="text-[#A1A1AA]" />
      </div>

      <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Revenue Over Time</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-white">R1,470,847</span>
              <span className="text-xs font-semibold text-[#22c55e]">+494%</span>
            </div>
          </div>
          <div className="flex gap-1">
            {["7D", "30D", "90D"].map((t, i) => (
              <span key={t}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  i === 1
                    ? "bg-[rgba(107,79,232,0.3)] border border-[rgba(107,79,232,0.5)] text-white"
                    : "border border-white/10 text-[#A1A1AA]"
                }`}>{t}</span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="mt-3 h-32 w-full">
          <defs>
            <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B5EE8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#7B5EE8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#areaG)" points="0,50 10,46 20,48 30,38 40,42 50,30 60,34 70,18 80,22 90,8 100,4 100,60 0,60" />
          <polyline fill="none" stroke="#7B5EE8" strokeWidth="1.2" points="0,50 10,46 20,48 30,38 40,42 50,30 60,34 70,18 80,22 90,8 100,4" />
        </svg>
      </div>
    </div>
  );
}

const ORDERS = [
  { city: "Johannesburg", id: "48201", amount: "R1,289", status: "Delivered", tone: "green" as const },
  { city: "Cape Town", id: "48211", amount: "R849", status: "In transit", tone: "amber" as const },
  { city: "Durban", id: "48221", amount: "R2,140", status: "Delivered", tone: "green" as const },
];

const STATUS_CLASS = {
  green: "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30",
  amber: "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30",
};

export function FulfilmentPanel() {
  return (
    <div className="glass relative overflow-hidden p-5">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7B5EE8]" />
          Vault · Live Order Feed
        </div>
        <span className="text-[11px] text-[#7B5EE8]">47 active today</span>
      </div>

      <div className="mt-4 space-y-2">
        {ORDERS.map((o) => (
          <div key={o.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[rgba(107,79,232,0.2)] text-[#7B5EE8]">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{o.city}</div>
              <div className="text-[11px] text-[#A1A1AA]">Order #{o.id}</div>
            </div>
            <div className="text-sm font-semibold text-white">{o.amount}</div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[o.tone]}`}>{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
