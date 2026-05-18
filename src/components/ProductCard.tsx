import { ExternalLink, Package } from "lucide-react";

export type Product = {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  image_url: string | null;
  shopify_url: string;
  sales_count?: number | null;
  trending?: boolean | null;
};

export const fmtZAR = (n: number) =>
  `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function categoryGradient(category: string): string {
  const map: Record<string, string> = {
    Fitness: "linear-gradient(135deg, #3a0a0a 0%, #7a1212 100%)",
    Beauty: "linear-gradient(135deg, #3a0a24 0%, #8a1d57 100%)",
    Home: "linear-gradient(135deg, #062a2a 0%, #0e6b6b 100%)",
    Tech: "linear-gradient(135deg, #0a1733 0%, #1e3a8a 100%)",
    "Pet Products": "linear-gradient(135deg, #3a1a05 0%, #9a4a10 100%)",
    Fashion: "linear-gradient(135deg, #1a0a3a 0%, #4a1a8a 100%)",
    "Hair Care": "linear-gradient(135deg, #052e1a 0%, #0d6b3d 100%)",
    Skincare: "linear-gradient(135deg, #3a0a1c 0%, #9a1d44 100%)",
    Baby: "linear-gradient(135deg, #0a2540 0%, #1e6fa8 100%)",
    "Men's Grooming": "linear-gradient(135deg, #1a1f29 0%, #3a4556 100%)",
    Jewellery: "linear-gradient(135deg, #3a2a05 0%, #a8841a 100%)",
    "Home and Kitchen": "linear-gradient(135deg, #062a2a 0%, #0e6b6b 100%)",
    "Tech and Workspace": "linear-gradient(135deg, #0a1733 0%, #1e3a8a 100%)",
    "Baby and Mom": "linear-gradient(135deg, #0a2540 0%, #1e6fa8 100%)",
  };
  return map[category] ?? "linear-gradient(135deg, #111 0%, #1A1A1A 100%)";
}

export function ProductCard({
  product,
  rank,
}: {
  product: Product;
  rank?: number;
}) {
  const profit = Number(product.sell_price) - Number(product.cost_price);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] glow-card-hover">
      {rank !== undefined && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[color:var(--primary)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
          {ordinal(rank)}
        </span>
      )}
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: categoryGradient(product.category) }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/40">
            <Package className="h-12 w-12" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight text-white">{product.name}</h3>
          <span className="shrink-0 rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--primary)]">
            {product.category}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-lg font-bold text-[color:var(--primary)]">
            {fmtZAR(product.cost_price)}
          </div>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            Sell for {fmtZAR(product.sell_price)}
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-md bg-[color:var(--success)]/15 px-2 py-1 text-xs font-semibold text-[color:var(--success)]">
          {fmtZAR(profit)} profit
        </span>

        {typeof product.sales_count === "number" && product.sales_count > 0 && (
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {product.sales_count.toLocaleString()} sold
          </span>
        )}

        <a
          href={product.shopify_url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          Order Now
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
