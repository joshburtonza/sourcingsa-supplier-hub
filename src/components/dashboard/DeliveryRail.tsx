import type { OrderStatus } from "@/lib/orders";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "unfulfilled", label: "Placed" },
  { key: "processing", label: "Packed" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
];

const STEP_INDEX: Record<string, number> = {
  unfulfilled: 0,
  processing: 1,
  in_transit: 2,
  delivered: 3,
};

/** Placed → Packed → In transit → Delivered progress rail for one order. */
export function DeliveryRail({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle?: string;
  status: OrderStatus;
}) {
  const cancelled = status === "cancelled";
  const idx = STEP_INDEX[status] ?? 0;
  const pct = cancelled ? 100 : Math.max(6, (idx / (STEPS.length - 1)) * 100);

  return (
    <div
      className={`rounded-2xl border p-4 ${cancelled ? "border-red-500/30 bg-red-500/[0.06]" : "border-[color:var(--border)] bg-white/[0.03]"}`}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <b className="text-[13px] font-semibold tracking-tight text-white">{title}</b>
        {subtitle && (
          <small className="text-[11px] text-[color:var(--muted-foreground)]">{subtitle}</small>
        )}
      </div>
      {cancelled ? (
        <div className="text-[12.5px] font-semibold text-red-300">Order cancelled</div>
      ) : (
        <>
          <div className="relative h-1 rounded-full bg-white/10">
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg,var(--primary),var(--blue-lighter))",
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10.5px] font-semibold">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={
                  i <= idx
                    ? "text-[color:var(--blue-lighter)]"
                    : "text-[color:var(--muted-foreground)]"
                }
              >
                {s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
