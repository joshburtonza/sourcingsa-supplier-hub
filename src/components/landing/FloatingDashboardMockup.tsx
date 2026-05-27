import {
  LayoutDashboard, Package, ShoppingCart, BarChart3, Truck,
  LifeBuoy, Settings, Search, ChevronRight, Zap, Eye,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Package, label: "Products" },
  { icon: ShoppingCart, label: "Orders" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Truck, label: "Suppliers" },
  { icon: LifeBuoy, label: "Support" },
  { icon: Settings, label: "Settings" },
];

const BARS = [
  { h: 22 }, { h: 30 }, { h: 26 }, { h: 42 }, { h: 38 },
  { h: 55 }, { h: 48 }, { h: 62 }, { h: 70 }, { h: 60 },
  { h: 78 }, { h: 95, accent: true },
];

const Y_LABELS = ["R5k", "R4k", "R3k", "R2k", "R1k"];

export function FloatingDashboardMockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* purple top edge glow */}
      <div aria-hidden className="pointer-events-none absolute -top-6 left-1/2 h-12 w-[80%] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(123,94,232,0.5), transparent 70%)", filter: "blur(20px)" }} />

      <div className="relative overflow-hidden rounded-t-3xl border border-white/10 bg-[#0D0E1A]">
        <div className="flex min-h-[520px]">
          {/* Sidebar */}
          <aside className="hidden w-60 shrink-0 border-r border-white/8 p-4 md:block">
            <div className="flex items-center gap-2 px-2 pb-4">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[rgba(107,79,232,0.25)] border border-[rgba(107,79,232,0.5)]">
                <Zap className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="font-display text-sm font-bold text-white">ZA Supplier Hub</span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
              <input readOnly placeholder="Search…"
                className="glass-input w-full py-2 pl-8 pr-12 text-xs" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-[#A1A1AA]">⌘K</span>
            </div>

            <nav className="mt-5 space-y-1">
              {NAV.map((n) => (
                <button key={n.label}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition ${
                    n.active
                      ? "bg-white/10 text-white"
                      : "text-[#A1A1AA] hover:bg-white/5 hover:text-white"
                  }`}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <div className="flex-1 p-5 sm:p-7">
            <div className="flex items-center gap-1 text-[11px] text-[#A1A1AA]">
              Home <ChevronRight className="h-3 w-3" /> <span className="text-white">Dashboard</span>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Welcome back!</h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[rgba(107,79,232,0.2)] text-[#7B5EE8]">
                    <Zap className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Active Orders</span>
                </div>
                <div className="mt-3 text-3xl font-bold text-white">1,316</div>
                <button className="glass-pill mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-[11px]">
                  <Eye className="h-3 w-3" /> View details
                </button>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-3/4 rounded-full" style={{ background: "linear-gradient(to right, #3D1FA3, #7B5EE8)" }} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[rgba(107,79,232,0.2)] text-[#7B5EE8]">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">Active Members</span>
                </div>
                <div className="mt-3 text-3xl font-bold text-white">500+</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div>
                <div className="text-sm font-semibold text-white">Revenue Overview</div>
                <div className="text-[11px] text-[#A1A1AA]">Showing revenue and sales data</div>
              </div>

              <div className="mt-5 flex gap-3">
                <div className="flex flex-col justify-between py-1 text-[10px] text-[#A1A1AA]">
                  {Y_LABELS.map((y) => <span key={y}>{y}</span>)}
                </div>
                <div className="relative flex h-36 flex-1 items-end gap-1.5">
                  {BARS.map((b, i) => (
                    <div key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${b.h}%`,
                        background: b.accent
                          ? "linear-gradient(to top, #7B5EE8, #22D3EE)"
                          : "rgba(255,255,255,0.1)",
                      }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
