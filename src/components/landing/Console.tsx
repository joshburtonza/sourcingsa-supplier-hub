import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { fmtZAR } from "@/lib/orders";

/**
 * The animated "live fulfilment console" hero visual. Marketing-page
 * illustration only (pre-auth, no real user data) — same role as the old
 * CataloguePreview/SalesOverviewMock it replaces. Numbers are representative,
 * not live figures.
 */

const BARS = [22, 30, 26, 38, 34, 46, 42, 55, 50, 64, 58, 72, 68, 80, 74, 88, 82, 95, 90, 100];

const FEED = [
  { name: "Highlight Stick", city: "Cape Town", cost: 82, sell: 202 },
  { name: "Shirt Dress", city: "Johannesburg", cost: 320, sell: 815 },
  { name: "Grooming Brush", city: "Durban", cost: 402, sell: 1022 },
  { name: "Kitchen Organiser", city: "Pretoria", cost: 168, sell: 429 },
];

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

export function Console() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (setActive(true), io.disconnect())),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const revenue = useCountUp(48260, active);
  const orders = useCountUp(47, active);
  const ninetyDay = useCountUp(1470847, active);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[552px] overflow-hidden rounded-[30px] border border-white/10"
      style={{
        background: "linear-gradient(175deg,#12161D,#0A0C10)",
        boxShadow: "0 50px 110px -40px rgba(0,0,0,.9), 0 0 100px -55px rgba(22,139,248,.9)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.02] px-4 py-3.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <b className="ml-2 text-[12px] font-semibold tracking-wide text-white/40">Vault · Fulfilment console</b>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[color:var(--blue-line)] bg-[color:var(--blue-dim)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--blue-lighter)]">
          <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--blue-lighter)]" />
          LIVE
        </span>
      </div>

      <div className="p-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
            <small className="block text-[10.5px] font-semibold text-white/40">Revenue today</small>
            <strong className="mt-1.5 block text-xl font-extrabold tracking-tight tabular-nums text-white">{fmtZAR(revenue)}</strong>
            <span className="mt-1.5 inline-block text-[10.5px] font-bold text-emerald-400">+18.4%</span>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
            <small className="block text-[10.5px] font-semibold text-white/40">Orders placed</small>
            <strong className="mt-1.5 block text-xl font-extrabold tracking-tight tabular-nums text-white">{orders}</strong>
            <span className="mt-1.5 inline-block text-[10.5px] font-bold text-emerald-400">+12 today</span>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
            <small className="block text-[10.5px] font-semibold text-white/40">Avg margin</small>
            <strong className="mt-1.5 block text-xl font-extrabold tracking-tight tabular-nums text-white">R993</strong>
            <span className="mt-1.5 inline-block text-[10.5px] font-bold text-emerald-400">Your cut</span>
          </div>
        </div>

        {/* revenue bars */}
        <div className="mt-3 rounded-[13px] border border-white/8 bg-white/[0.03] p-3.5">
          <div className="mb-3.5 flex items-baseline justify-between gap-2">
            <div>
              <b className="text-[19px] font-extrabold tracking-tight tabular-nums text-white">{fmtZAR(ninetyDay)}</b>{" "}
              <em className="not-italic text-[11.5px] font-bold text-emerald-400">+494%</em>
            </div>
            <small className="whitespace-nowrap text-[10.5px] font-semibold text-white/40">Revenue · 90D</small>
          </div>
          <div className="flex h-[104px] items-end gap-[5px]">
            {BARS.map((h, i) => (
              <i
                key={i}
                className="flex-1 origin-bottom rounded-t"
                style={{
                  height: `${h}%`,
                  background: i === BARS.length - 1
                    ? "linear-gradient(180deg,#fff,var(--blue-lighter))"
                    : "linear-gradient(180deg,var(--blue-lighter),rgba(22,139,248,.25))",
                  boxShadow: i === BARS.length - 1 ? "0 0 16px rgba(76,184,255,.55)" : undefined,
                  transform: active ? "scaleY(1)" : "scaleY(0)",
                  transition: `transform .6s cubic-bezier(.22,1,.36,1) ${i * 25}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* delivery rail */}
        <div className="mt-3.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <b className="text-[12.5px] font-semibold tracking-tight text-white">Order #4821 · Cape Town</b>
            <small className="text-[11px] text-white/40">Day 6 of 10</small>
          </div>
          <div className="relative h-1 rounded-full bg-white/10">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: active ? "64%" : "6%",
                background: "linear-gradient(90deg,var(--primary),var(--blue-lighter))",
                transition: "width 2.4s cubic-bezier(.22,1,.36,1) .3s",
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10.5px] font-semibold text-white/40">
            <span>Placed</span><span>Packed</span><span>In transit</span><span>Delivered</span>
          </div>
        </div>

        {/* order feed */}
        <div className="mt-4 grid gap-2">
          {FEED.map((o) => (
            <div key={o.name} className="grid grid-cols-[30px_1fr_auto] items-center gap-2.5 rounded-[11px] border border-white/8 bg-white/[0.032] px-3 py-2.5">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/6">
                <MapPin className="h-3.5 w-3.5 text-white/50" />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[12.5px] font-semibold text-white">{o.name}</b>
                <small className="block text-[11px] text-white/40">{o.city} · {fmtZAR(o.cost)} → {fmtZAR(o.sell)}</small>
              </span>
              <span className="whitespace-nowrap rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400">
                +{fmtZAR(o.sell - o.cost)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
