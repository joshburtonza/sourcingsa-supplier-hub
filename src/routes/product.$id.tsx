import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, ArrowLeft, Package, Check, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useCart } from "@/lib/cart";
import { fmtZAR, STOCK_META } from "@/lib/orders";
import type { Product } from "@/components/ProductCard";

export const Route = createFileRoute("/product/$id")({
  component: () => (
    <ProtectedShell>
      <ProductDetail />
    </ProtectedShell>
  ),
});

const COLS =
  "id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,description,stock_status,sales_count,trending";

function ProductDetail() {
  const { id } = Route.useParams();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("products").select(COLS).eq("id", id).maybeSingle();
      if (error) console.error("[product] load failed", error.message);
      if (!cancelled) {
        setProduct((data as Product) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-semibold text-white">Product not found</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">It may have been removed from the catalogue.</p>
        <Link to="/products" className="mt-6 inline-block rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">
          Back to catalogue
        </Link>
      </div>
    );
  }

  const img = product.image_url || product.images?.[0] || null;
  const cost = Number(product.cost_price);
  const sell = Number(product.sell_price);
  const profit = sell - cost;
  const margin = sell > 0 ? Math.round((profit / sell) * 100) : 0;
  const stock = product.stock_status ?? "in_stock";
  const outOfStock = stock === "out_of_stock";
  const stockMeta = STOCK_META[stock];
  const buyHref = product.checkout_url ?? product.shopify_url ?? null;
  const buyNow = buyHref ? buyHref.replace(/:1$/, `:${qty}`) : null;

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--primary)]">
        <ArrowLeft className="h-4 w-4" /> Back to catalogue
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image — contained, not blown up */}
        <div className="mx-auto w-full max-w-md">
          <div className="aspect-square overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white">
            {img ? (
              <img src={img} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[color:var(--card)] text-white/30">
                <Package className="h-16 w-16" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[color:var(--primary)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--primary)]">
              {product.category}
            </span>
            {product.trending && (
              <span className="rounded-full bg-[color:var(--primary)]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Trending</span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl">{product.name}</h1>

          <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{fmtZAR(cost)}</span>
              <span className="text-sm text-[color:var(--muted-foreground)]">your cost</span>
            </div>
            <div className="mt-1 text-sm text-[color:var(--muted-foreground)]">Suggested sell price {fmtZAR(sell)}</div>
            <div className="mt-3 inline-flex items-center rounded-md bg-[color:var(--success)]/15 px-2.5 py-1 text-sm font-semibold text-[color:var(--success)]">
              {fmtZAR(profit)} profit per sale · {margin}% margin
            </div>
          </div>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{product.description}</p>
          )}

          <ul className="mt-5 grid gap-2 text-sm text-white sm:grid-cols-2">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={3} /> Ships nationwide in 2-5 days</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={3} /> No stock to hold</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={3} /> We fulfil direct to your customer</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={3} /> Secure once-off checkout</li>
          </ul>

          <div className="mt-6 space-y-3">
            {stockMeta && stock !== "in_stock" && (
              <div className={`text-sm font-medium ${stockMeta.cls}`}>{stockMeta.label}</div>
            )}

            {outOfStock ? (
              <button disabled className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3.5 text-base font-semibold text-white opacity-50 sm:w-auto">
                <ShoppingBag className="h-5 w-5" /> Out of stock
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-lg border border-[color:var(--border)]">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-12 place-items-center text-[color:var(--muted-foreground)] hover:text-white" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                  <span className="w-12 text-center text-base font-semibold text-white">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(999, q + 1))} className="grid h-12 w-12 place-items-center text-[color:var(--muted-foreground)] hover:text-white" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                </div>
                {cart && (
                  <button
                    onClick={() => cart.add(product, qty)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn sm:flex-none"
                  >
                    <Plus className="h-5 w-5" /> Add to cart
                  </button>
                )}
                {buyNow && (
                  <a
                    href={buyNow}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color:var(--primary)] px-6 py-3 text-base font-semibold text-[color:var(--primary)] transition-colors hover:bg-[color:var(--primary)]/10 sm:flex-none"
                  >
                    <ShoppingBag className="h-5 w-5" /> Buy now
                  </a>
                )}
              </div>
            )}

            <p className="text-xs text-[color:var(--muted-foreground)]">
              You pay {fmtZAR(cost * qty)} for {qty} {qty > 1 ? "units" : "unit"} at checkout. Resell each for {fmtZAR(sell)}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
