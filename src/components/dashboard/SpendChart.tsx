import { useEffect, useState } from "react";
import { fmtZAR } from "@/lib/orders";

/** Groups orders into 12 weekly buckets over the last 90 days and renders a bar chart of spend. */
export function SpendChart({ orders }: { orders: { amount: number; ordered_at: string }[] }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(t);
  }, []);

  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const o of orders) {
    const age = now - new Date(o.ordered_at).getTime();
    if (age < 0 || age > 12 * WEEK) continue;
    const idx = 11 - Math.floor(age / WEEK);
    if (idx >= 0 && idx < 12) buckets[idx] += Number(o.amount);
  }
  const total = buckets.reduce((s, v) => s + v, 0);
  const max = Math.max(...buckets, 1);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <b className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
            {fmtZAR(total)}
          </b>
        </div>
        <small className="text-[11px] font-semibold text-[color:var(--muted-foreground)]">
          Spend with the hub · 12 weeks
        </small>
      </div>
      <div className="flex h-[150px] items-end gap-1.5">
        {buckets.map((v, i) => (
          <div
            key={i}
            className="flex-1 origin-bottom rounded-t"
            title={fmtZAR(v)}
            style={{
              height: `${Math.max((v / max) * 100, 3)}%`,
              background:
                i === 11
                  ? "linear-gradient(180deg,#fff,var(--blue-lighter))"
                  : "linear-gradient(180deg,var(--blue-lighter),rgba(22,139,248,.25))",
              boxShadow: i === 11 ? "0 0 16px rgba(76,184,255,.55)" : undefined,
              transform: active ? "scaleY(1)" : "scaleY(0)",
              transition: `transform .6s cubic-bezier(.22,1,.36,1) ${i * 25}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
