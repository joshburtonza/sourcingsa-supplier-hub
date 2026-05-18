import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Clock } from "lucide-react";
import { ProtectedShell } from "@/components/ProtectedShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Support — Members" },
      { name: "description", content: "Get help with your account and orders." },
    ],
  }),
});

const FAQS = [
  {
    q: "How do I place an order?",
    a: "Browse Find Products or Trending Products, choose a product, and click Order Now. You'll be taken to a secure checkout to complete the purchase.",
  },
  {
    q: "How long does delivery take?",
    a: "Most local SA orders are processed within 24 hours and delivered to your customer within a few business days, depending on the courier and location.",
  },
  {
    q: "Can I request a product that's not listed?",
    a: "Yes. Use the Request a Product page and we'll source it from a vetted SA supplier within 48 hours.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Major South African cards, EFT and Instant EFT options are supported at checkout.",
  },
  {
    q: "How do I get help with a specific order?",
    a: "Email or WhatsApp us with your order ID and we'll respond during business hours.",
  },
];

function Page() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Support</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Answers to common questions and direct contact options.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5"
            >
              <Accordion type="single" collapsible>
                <AccordionItem value={String(i)} className="border-b-0">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[color:var(--muted-foreground)]">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a
          href="mailto:sa.dropstore@gmail.com"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
        >
          <Mail className="h-4 w-4" />
          Email Support
        </a>
        <a
          href="https://wa.me/27723979430"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Support
        </a>
      </section>

      <section className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <Clock className="h-5 w-5 text-[color:var(--primary)]" />
        <div>
          <div className="text-sm font-semibold text-white">Business hours</div>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            Monday to Friday, 8am – 6pm SAST
          </div>
        </div>
      </section>
    </div>
  );
}
