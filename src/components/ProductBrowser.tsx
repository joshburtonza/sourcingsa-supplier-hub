import { useEffect, useState } from "react";
import { supabase, getAccessToken } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "./ProductCard";

// Skew-proof access token: client.ts caches the token and refreshes it on a
// wall-clock interval, so we never call getSession()/refreshSession() per request
// against the DEVICE clock (that storms on a fast clock and kicked members out).
// The fetch below still does a single 401-retry for a genuinely-expired token.
async function freshToken(): Promise<string | null> {
  return getAccessToken();
}

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
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [priceIdx, setPriceIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
      try {
        setErrorMessage(null);

        const body = JSON.stringify({ category, priceIdx, search: debouncedSearch, trendingOnly, page });
        const doSearch = (tok: string) =>
          fetch("/api/products/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
            body,
          });

        let token = await freshToken();
        if (!token) {
          // Authenticated UI but no usable token — never blank-out as if there
          // are no products; tell them it's a connection issue.
          if (!cancelled) {
            setErrorMessage("Reconnecting to your account… please refresh the page.");
            if (page === 0) setProducts([]);
            setHasMore(false);
          }
          return;
        }

        let res = await doSearch(token);
        // One auth retry: a stale/expired token (clock skew, tab refocus) gets a
        // forced refresh and a single retry before we surface an error.
        if (res.status === 401 || res.status === 403) {
          const { data: r } = await supabase.auth.refreshSession();
          const t2 = r.session?.access_token;
          if (t2) res = await doSearch(t2);
        }

        // Guard res.json(): a Worker/proxy 502/504 returns HTML, not JSON, and an
        // unguarded parse would mask the real status with "Unexpected token <".
        const data = (await res.json().catch(() => ({ ok: false }))) as {
          ok: boolean; error?: string; products?: Product[]; hasMore?: boolean;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `Couldn't load products (status ${res.status}). Please try again.`);
        }
        const rows = data.products ?? [];
        setProducts((prev) => (page === 0 ? rows : [...prev, ...rows]));
        setHasMore(Boolean(data.hasMore));
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Couldn't load products. Please try again.";
        console.error("[products] load failed", message);
        setErrorMessage(message);
        if (page === 0) setProducts([]);
        setHasMore(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, priceIdx, debouncedSearch, trendingOnly, page, reloadKey]);

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

      {errorMessage && (
        <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
        </div>
      ) : errorMessage && products.length === 0 ? (
        // A failed load must NOT masquerade as an empty category ("No products
        // available"). Show a retry — the banner above explains it's a connection
        // issue, not that the category is genuinely empty.
        <div className="grid place-items-center gap-3 py-12">
          <p className="text-center text-sm text-[color:var(--muted-foreground)]">
            We couldn&apos;t load these products just now. This is a connection hiccup, not an empty category.
          </p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[color:var(--primary)]"
          >
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-[color:var(--muted-foreground)]">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                rank={rankItems && !debouncedSearch.trim() ? i + 1 : undefined}
              />
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
