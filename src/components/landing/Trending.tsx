import { Lock, Star } from "lucide-react";

const PRODUCTS = [
  { rank: "1st place", sales: "3.4K", bars: [40, 55, 65, 80, 92] },
  { rank: "2nd place", sales: "2.8K", bars: [30, 45, 55, 65, 78] },
  { rank: "3rd place", sales: "2.5K", bars: [25, 35, 50, 60, 70] },
  { rank: "4th place", sales: "1.6K", bars: [20, 28, 35, 42, 52] },
];

const AVATARS = ["JV", "MS", "RB", "CP", "WP"];

export function TrendingSection() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center -space-x-2">
            {AVATARS.map((a, i) => (
              <div key={a} className="grid h-9 w-9 place-items-center rounded-full border-2 border-black text-xs font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${230 + i * 6} 70% ${40 + i * 4}%) 0%, hsl(${250 + i * 5} 60% ${30 + i * 3}%) 100%)`,
                  zIndex: AVATARS.length - i,
                }}>
                {a}
              </div>
            ))}
            <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-[color:var(--primary)] text-xs font-bold text-white"
              style={{ zIndex: 0 }}>+</div>
          </div>
          <p className="text-center text-sm text-[color:var(--muted-foreground)]">
            Trusted by 500+ South African dropshippers generating R50M+ in sales
          </p>
        </div>

        <h2 className="mt-16 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Top Trending Products This Week
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p, i) => (
            <article key={i} className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)]"
              style={{ background: "linear-gradient(160deg, #1e1b4b 0%, #0f172a 100%)" }}>
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 grid-bg opacity-50" />
                <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
                    <Lock className="h-3.5 w-3.5 text-[color:var(--primary)]" />
                    Members Only
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--secondary-accent,#818cf8)]">
                    {p.rank}
                  </span>
                </div>
                <div className="h-3 w-3/4 rounded bg-white/10 blur-[3px]" />
                <div className="h-3 w-1/2 rounded bg-white/10 blur-[3px]" />

                <div className="flex items-end justify-between pt-2">
                  <div>
                    <div className="text-2xl font-bold text-[#22c55e]">{p.sales}</div>
                    <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                      sales this week
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-10">
                    {p.bars.map((h, j) => (
                      <div key={j} className="w-1.5 rounded-sm bg-[#22c55e]" style={{ height: `${h}%`, opacity: 0.4 + j * 0.12 }} />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href="#pricing"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-[color:var(--primary)] hover:bg-black">
            <Lock className="h-4 w-4 text-[color:var(--primary)]" />
            Unlock all trending products — R99/month
            <span className="text-[color:var(--primary)]">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function StarRatingPills() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {["Trustpilot", "Shopify App Store"].map((label) => (
        <div key={label}
          className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-1.5 text-xs">
          <div className="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
            ))}
          </div>
          <span className="text-white">{label}</span>
        </div>
      ))}
    </div>
  );
}
