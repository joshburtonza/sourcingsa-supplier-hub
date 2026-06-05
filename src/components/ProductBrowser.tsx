import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "./ProductCard";
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const PRICE_RANGES = [
  { label: "Any Price", min: 0, max: Infinity },
  { label: "Under R200", min: 0, max: 200 },
  { label: "R200 – R500", min: 200, max: 500 },
  { label: "R500 – R1000", min: 500, max: 1000 },
  { label: "Over R1000", min: 1000, max: Infinity },
];

export function ProductBrowser({
  trendingOnly = false,
  rankItems = false,
  emptyMessage = "No products available yet.",
}: {
  trendingOnly?: boolean;
  rankItems?: boolean;
  emptyMessage?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [priceIdx, setPriceIdx] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Explicit member-safe columns, never select("*") here, that would
      // ship the internal `supplier_note` field to every member's browser.
      let q = supabase
        .from("products")
        .select("id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,description,stock_status,active,sales_count,trending")
        .eq("active", true)
        // Products with a real image lead; the imageless legacy items sort last
        // (nullsFirst:false) so the catalogue never opens on placeholder cards.
        .order("image_url", { ascending: false, nullsFirst: false });
      if (trendingOnly) q = q.order("sales_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) console.error("[products] load failed", error.message);
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, [trendingOnly]);

  // Derive the category list from the real catalogue so the dropdown options
  // always match actual product.category values (a hardcoded list silently
  // breaks the filter whenever the catalogue's categories differ).
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [products],
  );

  const filtered = useMemo(() => {
    const pr = PRICE_RANGES[priceIdx];
    return products.filter((p) => {
      const okCat = category === "All" || p.category === category;
      const okSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const okPrice = Number(p.cost_price) >= pr.min && Number(p.cost_price) <= pr.max;
      return okCat && okSearch && okPrice;
    });
  }, [products, search, category, priceIdx]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center text-[color:var(--muted-foreground)]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="input focus-glow pl-11"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input focus-glow sm:w-48"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-[color:var(--card)]">
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>
        <select
          value={priceIdx}
          onChange={(e) => setPriceIdx(Number(e.target.value))}
          className="input focus-glow sm:w-48"
        >
          {PRICE_RANGES.map((p, i) => (
            <option key={p.label} value={i} className="bg-[color:var(--card)]">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-[color:var(--muted-foreground)]">{emptyMessage}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} rank={rankItems ? i + 1 : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
