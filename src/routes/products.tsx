import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/ProtectedShell";
import { ProductBrowser } from "@/components/ProductBrowser";
import { NicheRecommender } from "@/components/NicheRecommender";

export const Route = createFileRoute("/products")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Find Products, Members" },
      { name: "description", content: "Browse vetted SA supplier products." },
    ],
  }),
});

function Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Find Products</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Browse vetted SA supplier products and order with one click.
        </p>
      </header>
      <NicheRecommender />
      <ProductBrowser />
    </div>
  );
}
