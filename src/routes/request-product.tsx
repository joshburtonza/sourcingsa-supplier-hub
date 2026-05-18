import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, FileText, Search, Tag } from "lucide-react";
import { ProtectedShell } from "@/components/ProtectedShell";

export const Route = createFileRoute("/request-product")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Request a Product — Members" },
      { name: "description", content: "Request a product and we'll source it." },
    ],
  }),
});

const STEPS = [
  {
    icon: FileText,
    title: "Send us the product details",
    body: "Share a link, image, or description of the product you'd like to source.",
  },
  {
    icon: Search,
    title: "We source and validate it within 48 hours",
    body: "Our team contacts trusted SA suppliers and confirms quality and stock.",
  },
  {
    icon: Tag,
    title: "You get a quote with cost price and margin",
    body: "Receive a clear quote — cost, suggested sell price, and your margin.",
  },
];

function Page() {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Request a Product</h1>
        <p className="mt-3 text-[color:var(--foreground)]">
          Can't find what you're looking for? We source products on request. Send us the product
          details and we'll find the best local supplier and pricing for you.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card-hover"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-sm font-bold text-[color:var(--primary)]">
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5 text-[color:var(--primary)]" />
              </div>
              <h3 className="font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <a
          href="mailto:sa.dropstore@gmail.com"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          <Mail className="h-4 w-4" />
          Email Us
        </a>
        <a
          href="https://wa.me/27723979430"
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Us
        </a>
      </section>
    </div>
  );
}
