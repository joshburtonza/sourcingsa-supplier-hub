import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { StarRatingPills, TrendingSection } from "@/components/landing/Trending";
import { SalesPanel, FulfilmentPanel } from "@/components/landing/DashboardPreviews";

export const CHECKOUT_URL = "https://byjbdf-2k.myshopify.com/checkouts/cn/hWNCJl4hotDQ0n05xDu8oPnG/en-za?_r=AQABy_sDJ4mXBCFU5a7Bai_NPknqBl197qdTJdb9mCUKjEM&preview_theme_id=188057157949";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ZA Supplier Hub — The Products Behind Every Winning SA Dropshipping Store" },
      { name: "description", content: "Private supplier portal for South African dropshippers. Hand-picked products, real margins, vetted SA suppliers. R99/month." },
      { property: "og:title", content: "ZA Supplier Hub — Private SA Dropshipping Catalogue" },
      { property: "og:description", content: "Private supplier portal for South African dropshippers. R99/month, cancel anytime." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-black">
      <PublicNavbar />
      <div className="pt-16">
        <Hero />
        <TrendingSection />
        <StackSection />
        <StatsSection />
        <WhyItWorks />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}

const AVATARS = ["JV", "MS", "RB", "CP", "WP"];

function Hero() {
  return (
    <section className="grain relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#7B5EE8] bg-black px-4 py-1.5 text-xs">
          <Lock className="h-3 w-3 text-[#7B5EE8]" />
          <span className="text-[#A1A1AA]">Private Access · South Africa Only</span>
        </div>

        <h1 className="mt-8 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          The Products Behind Every Winning SA Dropshipping Store.
        </h1>

        <p className="mt-6 max-w-2xl text-base text-[#A1A1AA] sm:text-lg">
          Stop guessing what to sell. Stop gambling on 6-week shipping times.
          Get the exact products — ready to sell, ready to ship, straight to
          your South African customers.
        </p>

        <a href={CHECKOUT_URL} target="_blank" rel="noreferrer"
          className="btn-purple mt-10 inline-flex items-center gap-2 px-7 py-4 text-base">
          Get Instant Access — R99/month →
        </a>

        <p className="mt-4 text-xs text-[#A1A1AA]">
          Cancel anytime · No contracts · Instant access on payment
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center -space-x-2">
            {AVATARS.map((a, i) => (
              <div key={a} className="grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-[#111111] text-[11px] font-bold text-white"
                style={{ zIndex: AVATARS.length - i }}>{a}</div>
            ))}
            <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-black bg-[#7B5EE8] text-xs font-bold text-white">+</div>
          </div>
          <p className="text-center text-sm text-[#A1A1AA]">
            Trusted by 500+ South African dropshippers generating R50M+ in sales
          </p>
          <StarRatingPills />
        </div>
      </div>
    </section>
  );
}

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

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <FeatureBlock
            eyebrow="For Selling Products"
            title="Your private product catalogue."
            description="Hand-picked products validated for the SA market. Real margins. Real demand. Updated every week with new winning products so your store never goes stale."
            bullets={["SA-validated products", "Weekly updates", "Ready-made descriptions", "Ad angles included"]}
            panel={<SalesPanel />}
          />
          <FeatureBlock
            eyebrow="For Fulfilment"
            title="We ship it. You keep the profit."
            description="Customer orders from your store. You send us the order. We ship direct to your customer anywhere in South Africa. No stock. No warehouse. No stress. Products sourced and validated specifically for the SA market."
            bullets={["Vetted SA suppliers", "No stock needed", "Live order tracking", "Auto-notifications"]}
            panel={<FulfilmentPanel />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({ eyebrow, title, description, bullets, panel }: {
  eyebrow: string; title: string; description: string; bullets: string[]; panel: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#1F1F1F] bg-[#111111] p-6 md:p-8">
      <span className="inline-flex rounded-full border border-[#7B5EE8] bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7B5EE8]">
        {eyebrow}
      </span>
      <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA] sm:text-base">{description}</p>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-white">
            <Check className="h-4 w-4 text-[#7B5EE8]" strokeWidth={3} />
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-8">{panel}</div>
    </div>
  );
}

function StatsSection() {
  const stats = [
    { value: "R50M+", title: "Generated by SA dropshippers", body: "Using products from this catalogue. Real stores. Real people. Real income.", pill: "And growing every month" },
    { value: "500+", title: "Active South African sellers", body: "From Johannesburg to Cape Town — all selling online without holding a single product.", pill: "New members joining daily" },
    { value: "100+", title: "Vetted SA Products", body: "Hand-picked products validated for the South African market. Real demand. Real margins.", pill: "Updated weekly" },
  ];
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.value} className="flex flex-col rounded-2xl border border-[#1F1F1F] bg-[#111111] p-8 text-center">
              <div className="text-5xl font-bold tracking-tight text-white sm:text-6xl">{s.value}</div>
              <div className="mt-4 text-lg font-bold text-white">{s.title}</div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#A1A1AA]">{s.body}</p>
              <span className="mt-6 text-xs font-semibold text-[#7B5EE8]">{s.pill}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyItWorks() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <SectionEyebrow text="Why It Works" />
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Everything SA dropshippers actually need. In one place.
        </h2>
        <p className="mt-6 max-w-2xl text-base text-[#A1A1AA] sm:text-lg">
          Stop piecing it together from YouTube videos and Facebook groups.
          Get the products, the pricing, the margins and the supplier — all
          inside one private catalogue built for the SA market.
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  const features = [
    "Full private product catalogue access",
    "Weekly new winning products added",
    "Cost prices + suggested sell prices",
    "Ready-to-use product descriptions",
    "Pre-tested ad angles included",
    "Products sourced and validated specifically for the SA market",
    "Direct WhatsApp support",
    "Cancel anytime, no contracts",
  ];
  return (
    <section id="pricing" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-md">
        <div className="text-center">
          <SectionEyebrow text="Pricing" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One plan. Everything included.
          </h2>
        </div>

        <div className="mt-10 rounded-3xl bg-[#111111] p-8"
          style={{ border: "1px solid #7B5EE8", boxShadow: "0 0 30px rgba(107, 79, 232, 0.3)" }}>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#7B5EE8]">Member Access</div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-5xl font-bold tracking-tight text-white">R99</span>
            <span className="text-sm text-[#A1A1AA]">/month</span>
          </div>
          <p className="mt-2 text-sm text-[#A1A1AA]">
            Everything you need to launch and scale your SA dropshipping store.
          </p>

          <ul className="mt-8 space-y-3.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#7B5EE8]/15 text-[#7B5EE8]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm text-white">{f}</span>
              </li>
            ))}
          </ul>

          <a href={CHECKOUT_URL} target="_blank" rel="noreferrer"
            className="btn-purple mt-8 flex w-full items-center justify-center gap-2 px-6 py-4 text-base">
            Get Instant Access
          </a>
          <p className="mt-4 text-center text-xs text-[#A1A1AA]">Cancel anytime · No contracts</p>
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#7B5EE8] bg-black px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#7B5EE8]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">{text}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#1F1F1F] bg-black px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-[#A1A1AA]">© 2026 South Africa.</p>
        <div className="flex items-center gap-6 text-xs">
          <Link to="/login" className="text-[#A1A1AA] hover:text-white">Member Login</Link>
          <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer" className="text-[#A1A1AA] hover:text-white">
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
