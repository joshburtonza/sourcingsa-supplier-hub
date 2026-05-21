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

const CATEGORIES = ["All", "Hair Care", "Skincare", "Jewellery", "Fitness", "Home and Kitchen", "Tech and Workspace", "Pet Products", "Men's Grooming", "Baby and Mom", "Beauty", "Home", "Tech", "Fashion", "Baby"];
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
      let q = supabase.from("products").select("*");
      if (trendingOnly) q = q.order("sales_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data } = await q;
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, [trendingOnly]);

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
          {CATEGORIES.map((c) => (
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
