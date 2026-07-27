const PROVINCES = [
  "Western Cape",
  "Gauteng",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Mpumalanga",
  "North West",
  "Limpopo",
  "Northern Cape",
];

const normalize = (s: string) => s.trim().toLowerCase();

export function ProvinceBreakdown({ orders }: { orders: { shipping_province: string | null }[] }) {
  const byNormalized = new Map<string, number>();
  for (const o of orders) {
    const key = o.shipping_province ? normalize(o.shipping_province) : "unknown";
    byNormalized.set(key, (byNormalized.get(key) ?? 0) + 1);
  }
  const matched = new Set(PROVINCES.map(normalize));
  const total = orders.length || 1;
  const rows = PROVINCES.map((p) => ({
    name: p,
    count: byNormalized.get(normalize(p)) ?? 0,
  })).filter((r) => r.count > 0);
  const unmatched = Array.from(byNormalized.entries())
    .filter(([key]) => !matched.has(key))
    .reduce((sum, [, count]) => sum + count, 0);
  if (unmatched > 0) rows.push({ name: "Other / unknown", count: unmatched });
  rows.sort((a, b) => b.count - a.count);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
        No shipping data yet.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_54px] items-center gap-3 rounded-[11px] border border-[color:var(--border)] bg-white/[0.028] px-3 py-2.5"
        >
          <div className="min-w-0">
            <b className="block truncate text-[12.5px] font-semibold text-white">{r.name}</b>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/7">
              <span
                className="block h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${(r.count / total) * 100}%`,
                  background: "linear-gradient(90deg,var(--primary),var(--blue-lighter))",
                }}
              />
            </div>
          </div>
          <span className="text-right text-[13px] font-bold tabular-nums text-white">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}
