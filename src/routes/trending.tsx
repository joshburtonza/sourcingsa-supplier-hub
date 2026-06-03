import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/ProtectedShell";
import { ProductBrowser } from "@/components/ProductBrowser";

export const Route = createFileRoute("/trending")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Trending Products, Members" },
      { name: "description", content: "Top-selling products this week." },
    ],
  }),
});

function Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Trending Products</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Ranked by recent sales volume across the network.
        </p>
      </header>
      <ProductBrowser
        trendingOnly
        rankItems
        emptyMessage="No products available yet."
      />
    </div>
  );
}
