import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, ShoppingBag, Plus } from "lucide-react";
import { fmtZAR, STOCK_META } from "@/lib/orders";
import { useCart } from "@/lib/cart";
import { getVariantOptions, type ProductVariantMapEntry, type ProductVariantOption } from "@/lib/product-variants";
import { OrderModal } from "./OrderModal";

// Re-exported for the screens that already import it from here.
export { fmtZAR };

export type Product = {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  image_url: string | null;
  images?: string[] | null;
  shopify_url?: string | null;
  checkout_url?: string | null;
  variant_options?: ProductVariantOption[] | null;
  variant_map?: ProductVariantMapEntry[] | null;
  description?: string | null;
  stock_status?: string | null;
  active?: boolean | null;
  sales_count?: number | null;
  trending?: boolean | null;
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function categoryGradient(category: string): string {
  const map: Record<string, string> = {
    Fitness: "linear-gradient(135deg, #3a0a0a 0%, #7a1212 100%)",
    Beauty: "linear-gradient(135deg, #3a0a24 0%, #8a1d57 100%)",
    Tech: "linear-gradient(135deg, #0a1733 0%, #1e3a8a 100%)",
    "Pet Products": "linear-gradient(135deg, #3a1a05 0%, #9a4a10 100%)",
    Fashion: "linear-gradient(135deg, #1a0a3a 0%, #4a1a8a 100%)",
    "Hair Care": "linear-gradient(135deg, #052e1a 0%, #0d6b3d 100%)",
    Skincare: "linear-gradient(135deg, #3a0a1c 0%, #9a1d44 100%)",
    "Men's Grooming": "linear-gradient(135deg, #1a1f29 0%, #3a4556 100%)",
    Jewellery: "linear-gradient(135deg, #3a2a05 0%, #a8841a 100%)",
    "Home & Kitchen": "linear-gradient(135deg, #062a2a 0%, #0e6b6b 100%)",
    "Baby & Mom": "linear-gradient(135deg, #0a2540 0%, #1e6fa8 100%)",
  };
  return map[category] ?? "linear-gradient(135deg, #111 0%, #1A1A1A 100%)";
}

export function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  const [ordering, setOrdering] = useState(false);
  const cart = useCart();
  const profit = Number(product.sell_price) - Number(product.cost_price);
  const margin = product.sell_price > 0 ? Math.round((profit / Number(product.sell_price)) * 100) : 0;
  const img = product.image_url || product.images?.[0] || null;
  const stock = product.stock_status ?? "in_stock";
  const outOfStock = stock === "out_of_stock";
  const stockMeta = STOCK_META[stock];
  const variantOptions = getVariantOptions(product);
  const needsSelection = variantOptions.length > 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] glow-card-hover">
      {rank !== undefined && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[color:var(--primary)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
          {ordinal(rank)}
        </span>
      )}
      {product.trending && rank === undefined && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[color:var(--primary)]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          Trending
        </span>
      )}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-[4/3] overflow-hidden"
        style={{ background: categoryGradient(product.category) }}
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/40">
            <Package className="h-12 w-12" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to="/product/$id" params={{ id: product.id }} className="font-semibold leading-tight text-white transition-colors hover:text-[color:var(--primary)]">{product.name}</Link>
          <span className="shrink-0 rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--primary)]">
            {product.category}
          </span>
        </div>

        {product.description && (
          <p className="line-clamp-2 text-sm text-[color:var(--muted-foreground)]">{product.description}</p>
        )}

        <div className="mt-auto space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{fmtZAR(product.cost_price)}</span>
            <span className="text-xs text-[color:var(--muted-foreground)]">your cost</span>
          </div>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            Sell for {fmtZAR(product.sell_price)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-[color:var(--success)]/15 px-2 py-1 text-xs font-semibold text-[color:var(--success)]">
            {fmtZAR(profit)} profit · {margin}%
          </span>
          {needsSelection && (
            <span className="text-xs text-[color:var(--primary)]">
              {variantOptions.map((o) => o.name).join(" / ")}
            </span>
          )}
          {stockMeta && stock !== "in_stock" && (
            <span className={`text-xs font-medium ${stockMeta.cls}`}>{stockMeta.label}</span>
          )}
          {typeof product.sales_count === "number" && product.sales_count > 0 && (
            <span className="text-xs text-[color:var(--muted-foreground)]">{product.sales_count.toLocaleString()} sold</span>
          )}
        </div>

        {cart ? (
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn ${outOfStock ? "pointer-events-none opacity-50" : ""}`}
          >
            <ShoppingBag className="h-4 w-4" />
            {outOfStock ? "Out of stock" : needsSelection ? "Choose options" : "Choose quantity"}
          </Link>
        ) : product.checkout_url || product.shopify_url ? (
          <a
            href={product.checkout_url ?? product.shopify_url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (outOfStock) e.preventDefault(); }}
            className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn ${outOfStock ? "pointer-events-none opacity-50" : ""}`}
          >
            <ShoppingBag className="h-4 w-4" />
            {outOfStock ? "Out of stock" : "Order Now"}
          </a>
        ) : (
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => setOrdering(true)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {outOfStock ? "Out of stock" : "Order Now"}
          </button>
        )}
      </div>

      {ordering && <OrderModal product={product} onClose={() => setOrdering(false)} />}
    </article>
  );
}
