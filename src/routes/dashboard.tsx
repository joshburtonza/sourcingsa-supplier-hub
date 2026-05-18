import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Package, Tag, Headphones, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Supplier Catalogue" },
      { name: "description", content: "Browse and order supplier products." },
    ],
  }),
});

const CATEGORIES = ["All", "Fitness", "Pet Products", "Tech", "Home Decor", "Beauty", "Automotive"];

type Product = {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  image_url: string | null;
  shopify_url: string;
};

const fmt = (n: number) =>
  `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Dashboard() {
  const { isApproved, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (authLoading || !isApproved) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, [isApproved, authLoading]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const okCat = category === "All" || p.category === category;
      const okSearch =
        !search || p.name.toLowerCase().includes(search.toLowerCase());
      return okCat && okSearch;
    });
  }, [products, search, category]);

  const activeCats = useMemo(
    () => new Set(products.map((p) => p.category)).size,
    [products],
  );

  if (!authLoading && !isApproved) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center glow-card">
        <h2 className="text-xl font-semibold text-white">Account Pending Approval</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Your account exists but hasn&apos;t been approved yet. Message us on
          WhatsApp to get verified and gain access to the catalogue.
        </p>
        <a
          href="https://wa.me/27723979430"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          Contact on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--primary)] sm:text-4xl">
          Supplier Catalogue
        </h1>
        <p className="mt-2 text-[color:var(--foreground)]">
          Browse and order products for your store
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Package className="h-5 w-5" />} label="Total Products" value={products.length} />
        <Stat icon={<Tag className="h-5 w-5" />} label="Active Categories" value={activeCats} />
        <Stat icon={<Headphones className="h-5 w-5" />} label="Support" value="24/7" />
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="input focus-glow pl-11"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)] glow-btn"
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
        </div>
      ) : error ? (
        <p className="text-sm text-[color:var(--destructive)]">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-[color:var(--muted-foreground)]">
          No products match your filters.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {label}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const profit = product.sell_price - product.cost_price;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] glow-card-hover">
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #111 0%, #1A1A1A 100%)" }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[color:var(--muted-foreground)]">
            <Package className="h-12 w-12 opacity-30" />
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
          <div className="text-lg font-bold text-[color:var(--primary)]">{fmt(product.cost_price)}</div>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            Sell for {fmt(product.sell_price)}
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-md bg-[color:var(--success)]/15 px-2 py-1 text-xs font-semibold text-[color:var(--success)]">
          {fmt(profit)} profit
        </span>

        <a
          href={product.shopify_url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          Order Now
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
