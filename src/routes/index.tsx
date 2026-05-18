import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Check, DollarSign, Lock, Truck, Users,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { StarRatingPills, TrendingSection } from "@/components/landing/Trending";
import { SalesPanel, FulfilmentPanel } from "@/components/landing/DashboardPreviews";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "The Products Behind Every Winning SA Dropshipping Store" },
      { name: "description", content: "Private supplier portal for South African dropshippers. Hand-picked products, real margins, 2-5 day local delivery. R99/month." },
      { property: "og:title", content: "The Products Behind Every Winning SA Dropshipping Store" },
      { property: "og:description", content: "Private supplier portal for South African dropshippers. R99/month, cancel anytime." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <Hero />
      <TrendingSection />
      <StackSection />
      <StatsSection />
      <Pricing />
      <Footer />
    </div>
  );
}

/* ============= HERO ============= */
function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 30%, var(--glow) 0%, transparent 70%)",
        }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-30 grid-bg"
        style={{ maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)" }} />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center fade-in-up">
        <StarRatingPills />

        <div className="mt-5 flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-1.5 text-xs">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute h-2 w-2 rounded-full pulse-dot" />
            <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" />
          </span>
          <span className="font-semibold uppercase tracking-wider text-white">
            Private Access · South Africa Only
          </span>
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          The Products Behind Every
          <br />
          <span className="text-grad">Winning SA Dropshipping Store.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
          Stop guessing what to sell. Stop gambling on 6-week shipping times.
          Get the exact products — ready to sell, ready to ship, straight to
          your South African customers.
        </p>

        <a href="#pricing"
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3.5 text-base font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn">
          Get Instant Access — R99/month
          <ArrowRight className="h-4 w-4" />
        </a>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
          <Lock className="h-3 w-3" />
          Cancel anytime · No contracts · Instant access on payment
        </p>
      </div>
    </section>
  );
}

/* ============= STACK SECTION ============= */
function StackSection() {
  return (
    <section id="how" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <SectionEyebrow text="What You Get Access To" />
          <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Built for the way SA dropshippers actually sell.
          </h2>
        </div>

        <div className="mt-16 space-y-6">
          <StackCard
            stickyOffset="top-24"
            eyebrow="For Selling Products"
            title="Your private product catalogue."
            description="Hand-picked products validated for the SA market. Real margins. Real demand. Updated every week with new winning products so your store never goes stale."
            tags={["SA-validated products", "Weekly updates", "Ready-made descriptions", "Ad angles included"]}
            panel={<SalesPanel />}
          />
          <StackCard
            stickyOffset="top-32"
            eyebrow="For Fulfilment"
            title="We ship it. You keep the profit."
            description="Customer orders from your store. You send us the order. We ship direct to your customer in 2 to 5 days anywhere in South Africa. No stock. No warehouse. No stress."
            tags={["2–5 day SA delivery", "No stock needed", "Live order tracking", "Auto-notifications"]}
            panel={<FulfilmentPanel />}
            reverse
          />
        </div>
      </div>
    </section>
  );
}

function StackCard({ eyebrow, title, description, tags, panel, reverse, stickyOffset }: {
  eyebrow: string; title: string; description: string; tags: string[];
  panel: React.ReactNode; reverse?: boolean; stickyOffset: string;
}) {
  return (
    <div className={`sticky ${stickyOffset}`}>
      <div className="rotating-glow rounded-3xl">
        <div className="grid gap-10 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:grid-cols-2 md:p-12 lg:p-16">
          <div className={reverse ? "md:order-2" : ""}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
              {eyebrow}
            </div>
            <h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {title}
            </h3>
            <p className="mt-5 text-base leading-relaxed text-[color:var(--muted-foreground)]">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t}
                  className="rounded-full border border-[color:var(--border)] bg-black/50 px-3 py-1.5 text-xs text-white">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className={reverse ? "md:order-1" : ""}>{panel}</div>
        </div>
      </div>
    </div>
  );
}

/* ============= STATS ============= */
function StatsSection() {
  const stats = [
    {
      icon: <DollarSign className="h-5 w-5" />,
      value: "R50M+",
      title: "Generated by SA dropshippers",
      body: "Using products from this catalogue. Real stores. Real people. Real income.",
      pill: "And growing every month",
    },
    {
      icon: <Users className="h-5 w-5" />,
      value: "500+",
      title: "Active South African sellers",
      body: "From Johannesburg to Cape Town — all selling online without holding a single product.",
      pill: "New members joining daily",
    },
    {
      icon: <Truck className="h-5 w-5" />,
      value: "2–5",
      title: "Day delivery anywhere in SA",
      body: "No AliExpress. No 6-week waits. No customers asking where their order is.",
      pill: "Local fulfilment",
    },
  ];

  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.value}
              className="flex flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
                {s.icon}
              </div>
              <div className="mt-6 text-5xl font-bold tracking-tight text-grad-white sm:text-6xl">
                {s.value}
              </div>
              <div className="mt-4 text-lg font-bold text-white">{s.title}</div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                {s.body}
              </p>
              <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-3 py-1 text-xs font-semibold text-[#22c55e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                {s.pill}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-center text-center">
          <SectionEyebrow text="Why It Works" />
          <h2 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Everything SA dropshippers actually need.{" "}
            <span className="text-grad">In one place.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
            Stop piecing it together from YouTube videos and Facebook groups.
            Get the products, the pricing, the margins and the supplier — all
            inside one private catalogue built for the SA market.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============= PRICING ============= */
function Pricing() {
  const features = [
    "Full private product catalogue access",
    "Weekly new winning products added",
    "Cost prices + suggested sell prices",
    "Ready-to-use product descriptions",
    "Pre-tested ad angles included",
    "2–5 day delivery anywhere in SA",
    "Direct WhatsApp support",
    "Cancel anytime, no contracts",
  ];

  return (
    <section id="pricing" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[400px] max-w-2xl -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse, var(--glow) 0%, transparent 70%)" }} />

      <div className="relative mx-auto max-w-md">
        <div className="text-center">
          <SectionEyebrow text="Pricing" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One plan. Everything included.
          </h2>
        </div>

        <div className="mt-10 rotating-glow rounded-3xl">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--primary)]">
              Member Access
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight text-white">R99</span>
              <span className="text-sm text-[color:var(--muted-foreground)]">/month</span>
            </div>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Everything you need to launch and scale your SA dropshipping store.
            </p>

            <ul className="mt-8 space-y-3.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--primary)]/15 text-[color:var(--primary)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-white">{f}</span>
                </li>
              ))}
            </ul>

            <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3.5 text-base font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn">
              Get Instant Access
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-4 text-center text-xs text-[color:var(--muted-foreground)]">
              Cancel anytime · No contracts
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============= helpers ============= */
function SectionEyebrow({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
        {text}
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-[color:var(--muted-foreground)]">
          © {new Date().getFullYear()} Supplier Portal. South Africa.
        </p>
        <div className="flex items-center gap-6 text-xs">
          <Link to="/login" className="text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]">
            Member Login
          </Link>
          <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer"
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]">
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
