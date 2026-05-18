import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { ProtectedShell } from "@/components/ProtectedShell";

export const Route = createFileRoute("/how-to-order")({
  component: () => (
    <ProtectedShell>
      <HowToOrder />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "How to Order — Supplier Portal" },
      { name: "description", content: "Step-by-step ordering instructions." },
    ],
  }),
});

const STEPS = [
  {
    title: "Browse the Catalogue",
    body: "Open the Supplier Catalogue and filter by category. Each product shows your cost price, suggested sell price and profit margin.",
  },
  {
    title: "List on Your Store",
    body: "Click Order Now on any product to open its Shopify listing. Import the product details and images to your own store, then run ads to drive traffic.",
  },
  {
    title: "Receive Customer Orders",
    body: "When a customer places an order on your store, collect their full name, delivery address, contact number and the product details.",
  },
  {
    title: "Place the Order with Us",
    body: "Send the customer order details to us on WhatsApp. We dispatch directly to your customer in plain packaging, and you keep the profit.",
  },
];

function HowToOrder() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--primary)] sm:text-4xl">
          How to Order
        </h1>
        <p className="mt-2 text-[color:var(--foreground)]">
          Four simple steps from browsing to fulfilment
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li
            key={i}
            className="flex gap-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card-hover"
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-[color:var(--primary-foreground)]"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 0 20px -4px var(--glow-strong)",
              }}
            >
              {i + 1}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--foreground)]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center glow-card">
        <h2 className="text-xl font-semibold text-white">Ready to place an order?</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Send us the customer details and we&apos;ll handle the rest.
        </p>
        <a
          href="https://wa.me/27723979430"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          <MessageCircle className="h-4 w-4" />
          Message us on WhatsApp
        </a>
      </div>
    </div>
  );
}
