import { Lock, Star } from "lucide-react";

const PRODUCTS = [
  { rank: "1st", sales: "3.4K" },
  { rank: "2nd", sales: "2.8K" },
  { rank: "3rd", sales: "2.5K" },
  { rank: "4th", sales: "1.6K" },
];

export function TrendingSection() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Top Trending Products This Week
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {PRODUCTS.map((p, i) => (
            <article key={i} className="glass overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-50" />
                <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-md">
                  <div className="flex flex-col items-center gap-2">
                    <Lock className="h-7 w-7 text-[#7B5EE8]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Members Only</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <span className="glass-pill-purple inline-flex px-2.5 py-1 text-[10px] uppercase tracking-wider">
                  {p.rank} place
                </span>
                <div>
                  <div className="text-2xl font-bold text-white">{p.sales}</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">sales this week</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href="#pricing" className="glass-pill inline-flex px-5 py-2.5 text-sm">
            Unlock all trending products, R99 once-off →
          </a>
        </div>
      </div>
    </section>
  );
}

export function StarRatingPills() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <div className="glass-pill flex items-center gap-2 px-3 py-1.5 text-xs">
        <div className="flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
          ))}
        </div>
        <span className="text-white">Trustpilot</span>
      </div>
      <div className="glass-pill px-3 py-1.5 text-xs">Shopify App Store</div>
    </div>
  );
}
