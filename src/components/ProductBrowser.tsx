import { useEffect, useState } from "react";
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

// Members-safe columns, never select("*") (that would ship internal supplier_note).
const CARD_COLS =
  "id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,description,stock_status,active,sales_count,trending";
const PAGE = 48;

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
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [priceIdx, setPriceIdx] = useState(0);
  const [page, setPage] = useState(0);

  // Full category list via RPC — the browse query is capped at 1000 rows, so the
  // dropdown can't be derived from it once the catalogue is larger than that.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("hub_categories");
      if (error) {
        console.error("[products] categories load failed", error.message);
        return;
      }
      const cats = ((data as { category: string }[] | null) ?? [])
        .map((c) => c.category)
        .filter(Boolean);
      setCategories(["All", ...cats]);
    })();
  }, []);

  // Debounce the search box so each keystroke doesn't fire a query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change resets pagination to the first page.
  useEffect(() => {
    setPage(0);
  }, [category, priceIdx, debouncedSearch, trendingOnly]);

  // Server-side filtered + paginated fetch. This is what scales past the 1000-row
  // cap: the database does the category/search/price filtering, not the browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);
      const pr = PRICE_RANGES[priceIdx];
      let q = supabase.from("products").select(CARD_COLS).eq("active", true);
      if (trendingOnly) q = q.eq("trending", true);
      if (category !== "All") q = q.eq("category", category);
      const term = debouncedSearch.trim();
      if (term) q = q.ilike("name", `%${term}%`);
      if (pr.min > 0) q = q.gte("cost_price", pr.min);
      if (pr.max !== Infinity) q = q.lte("cost_price", pr.max);
      q = q
        .order("sales_count", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) console.error("[products] load failed", error.message);
      const rows = (data as Product[]) ?? [];
      setProducts((prev) => (page === 0 ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE);
      setLoading(false);
      setLoadingMore(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, priceIdx, debouncedSearch, trendingOnly, page]);

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
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-[color:var(--muted-foreground)]">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} rank={rankItems ? i + 1 : undefined} />
            ))}
          </div>
          {hasMore && (
            <div className="grid place-items-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[color:var(--primary)] disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more products"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
