import type { ReactNode } from "react";

export function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-[18px] glow-card-hover">
      <div className="mb-3.5 grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-[color:var(--blue-line)] bg-[color:var(--blue-dim)] text-[color:var(--blue-lighter)]">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <small className="block text-[11.5px] font-semibold text-[color:var(--muted-foreground)]">
        {label}
      </small>
      <strong className="mt-1.5 block text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-white">
        {value}
      </strong>
      {delta && (
        <span className="mt-2.5 inline-block text-[11.5px] font-bold text-emerald-400">
          {delta}
        </span>
      )}
    </div>
  );
}
