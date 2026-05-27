import { Lock, Star } from "lucide-react";

const PRODUCTS = [
  { rank: "1st place", sales: "3.4K" },
  { rank: "2nd place", sales: "2.8K" },
  { rank: "3rd place", sales: "2.5K" },
  { rank: "4th place", sales: "1.6K" },
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
            <article key={i} className="overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#111111]">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#0A0A0A]">
                <div className="absolute inset-0 grid-bg opacity-60" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                <div className="absolute inset-0 grid place-items-center">
                  <Lock className="h-7 w-7 text-[#7B5EE8]" />
                </div>
              </div>

              <div className="space-y-3 p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B5EE8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  {p.rank}
                </span>
                <div>
                  <div className="text-2xl font-bold text-white">{p.sales}</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                    sales this week
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href="#pricing" className="text-sm font-semibold text-[#7B5EE8] hover:underline">
            Unlock all trending products — R99/month →
          </a>
        </div>
      </div>
    </section>
  );
}

export function StarRatingPills() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-[#7B5EE8] bg-black px-3 py-1.5 text-xs">
        <div className="flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
          ))}
        </div>
        <span className="text-white">Trustpilot</span>
      </div>
      <div className="rounded-full border border-[#7B5EE8] bg-black px-3 py-1.5 text-xs text-white">
        Shopify App Store
      </div>
    </div>
  );
}
