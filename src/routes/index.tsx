import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Lock,
  Check,
  ShoppingBag,
  Truck,
  PackageSearch,
  Sparkles,
  ArrowRight,
  MapPin,
  Repeat,
  Wallet,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { SmoothScroll, Reveal } from "@/components/landing/motion";
import { fmtZAR } from "@/lib/orders";
import { CHECKOUT_URL } from "@/lib/checkout";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ZA Supplier Hub, The Products Behind Every Winning SA Dropshipping Store" },
      { name: "description", content: "Private supplier portal for South African dropshippers. Hand-picked products, real margins, local suppliers, fast local delivery. R99 once-off, lifetime access." },
      { property: "og:title", content: "ZA Supplier Hub, Private SA Dropshipping Catalogue" },
      { property: "og:description", content: "Hand-picked products, real margins, local fulfilment. R99 once-off, lifetime access." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "#05060F" }}>
      <SmoothScroll />
      <PublicNavbar />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <WhatYouGet />
      <ValueProps />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-50" style={{ maskImage: "radial-gradient(ellipse at center top, black 0%, transparent 70%)" }} />

      <div className="relative px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center fade-in-up">
          <div className="glass-pill-purple inline-flex items-center gap-2 px-4 py-1.5 text-xs">
            <Lock className="h-3 w-3" />
            <span>Private supplier portal · South Africa</span>
          </div>

          <h1 className="mt-8 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            The products behind every winning <span className="text-gradient">SA dropshipping</span> store.
          </h1>

          <p className="mt-6 max-w-2xl text-base text-[#A1A1AA] sm:text-lg">
            Stop guessing what to sell and gambling on 6-week shipping. Get hand-picked products
            with real margins, sourced locally, shipped fast, straight to your South African customers.
          </p>

          <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="glass-pill-purple mt-10 inline-flex items-center gap-2 px-7 py-4 text-base">
            Get instant access, R99 once-off <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-[#A1A1AA]">One payment · Lifetime access · No subscriptions</p>

          <div className="mt-8 flex items-center gap-2 text-sm text-[#A1A1AA]">
            <Sparkles className="h-4 w-4 text-[#7B5EE8]" />
            Join the founding members getting early access.
          </div>
        </div>

        <Reveal className="mx-auto mt-16 max-w-4xl" delay={120}>
          <CataloguePreview />
        </Reveal>
      </div>
    </section>
  );
}

const PREVIEW = [
  {
    name: "Water-Gloss Highlight Stick",
    category: "Makeup",
    cost: 82,
    sell: 202,
    img: "https://cdn.shopify.com/s/files/1/0999/3332/3581/files/0ca4ea03-a691-459c-bc32-1dd5b19a1386.jpg?v=1780582505",
  },
  {
    name: "Striped Shirt Dress",
    category: "Women's Dresses",
    cost: 320,
    sell: 815,
    img: "https://cdn.shopify.com/s/files/1/0999/3332/3581/files/d3374083fd2847ac98799e6a5866a085-goods.jpg?v=1780583769",
  },
  {
    name: "Beard & Hair Grooming Brush",
    category: "Hair Care",
    cost: 402,
    sell: 1022,
    img: "https://cdn.shopify.com/s/files/1/0999/3332/3581/files/694d7f2f-890d-4941-8f39-570d55effd68.jpg?v=1780583700",
  },
];

function CataloguePreview() {
  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4">
        <div className="text-sm font-semibold text-white">A peek at the catalogue</div>
        <div className="text-xs text-[#A1A1AA]">cost → suggested sell</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PREVIEW.map((p) => {
          const profit = p.sell - p.cost;
          const margin = Math.round((profit / p.sell) * 100);
          return (
            <div key={p.name} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-left">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-white">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{p.name}</div>
              <div className="text-[11px] uppercase tracking-wider text-[#7B5EE8]">{p.category}</div>
              <div className="mt-2 text-sm text-white">{fmtZAR(p.cost)} <span className="text-[#A1A1AA]">→ {fmtZAR(p.sell)}</span></div>
              <div className="mt-1 inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">{fmtZAR(profit)} profit · {margin}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = ["Local SA suppliers", "Ships nationwide", "No stock to hold", "Real, validated margins"];
  return (
    <div className="border-y border-white/8 bg-white/[0.02]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-[#A1A1AA] sm:px-6">
        {items.map((t) => (
          <span key={t} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#7B5EE8]" strokeWidth={3} />{t}</span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { icon: PackageSearch, title: "Browse the catalogue", body: "Hand-picked, SA-validated products with cost prices and suggested sell prices, your margin is clear before you list." },
  { icon: ShoppingBag, title: "Order for your customer", body: "Made a sale? Place the order in seconds and enter your customer's delivery details. You pay the cost price." },
  { icon: Truck, title: "We ship, you profit", body: "We ship direct to your customer anywhere in SA and you track every order live. No stock, no warehouse, no stress." },
];

function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col items-center text-center">
          <SectionEyebrow text="How it works" />
          <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">From product to profit in three steps.</h2>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="glass h-full p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary)]/15 text-[color:var(--primary)]"><s.icon className="h-5 w-5" /></span>
                  <span className="text-sm font-bold text-[#7B5EE8]">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatYouGet() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col items-center text-center">
          <SectionEyebrow text="What you get access to" />
          <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">Built for the way SA dropshippers actually sell.</h2>
        </Reveal>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-2">
          <Reveal>
            <FeatureBlock
              eyebrow="The catalogue"
              title="Your private product catalogue."
              description="Hand-picked products validated for the SA market, real demand, real margins. New winning products added every week so your store never goes stale."
              bullets={["SA-validated products", "Cost + suggested sell prices", "Weekly new products", "Ready-to-use descriptions"]}
            />
          </Reveal>
          <Reveal delay={90}>
            <SalesOverviewMock />
          </Reveal>
        </div>

        <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-2">
          <Reveal className="lg:order-2">
            <FeatureBlock
              eyebrow="The fulfilment"
              title="We ship it. You keep the profit."
              description="Your customer orders from your store. You order from us at cost. We ship direct to them, anywhere in SA, and you track every order live from your dashboard."
              bullets={["Local SA suppliers", "No stock to hold", "Live order tracking", "Ships nationwide"]}
            />
          </Reveal>
          <Reveal delay={90} className="lg:order-1">
            <OrderFeedMock />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({ eyebrow, title, description, bullets }: { eyebrow: string; title: string; description: string; bullets: string[] }) {
  return (
    <div className="glass h-full p-6 md:p-8">
      <span className="glass-pill-purple inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">{eyebrow}</span>
      <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA] sm:text-base">{description}</p>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-white"><Check className="h-4 w-4 text-[#7B5EE8]" strokeWidth={3} />{b}</li>
        ))}
      </ul>
    </div>
  );
}

function StatTile({ label, value, sub, subClass = "text-emerald-300" }: { label: string; value: string; sub: string; subClass?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#71717A]">{label}</div>
      <div className="mt-1.5 text-lg font-bold tracking-tight text-white">{value}</div>
      <div className={`mt-0.5 text-[11px] font-semibold ${subClass}`}>{sub}</div>
    </div>
  );
}

function SalesOverviewMock() {
  return (
    <div className="glass h-full p-5 md:p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Vault · Sales overview
        </span>
        <span className="text-[11px] text-[#71717A]">May 2026</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatTile label="Total revenue" value="R284K" sub="+514%" />
        <StatTile label="Orders" value="1,316" sub="+679%" />
        <StatTile label="Avg margin" value="R993" sub="Your cut" subClass="text-[#A1A1AA]" />
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#71717A]">Revenue over time</div>
          <div className="flex gap-1 text-[10px]">
            <span className="rounded-md px-1.5 py-0.5 text-[#71717A]">7D</span>
            <span className="rounded-md bg-[color:var(--primary)]/25 px-1.5 py-0.5 font-semibold text-white">30D</span>
            <span className="rounded-md px-1.5 py-0.5 text-[#71717A]">90D</span>
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">R1,470,847</span>
          <span className="text-xs font-semibold text-emerald-300">+494%</span>
        </div>
        <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="mt-3 h-24 w-full">
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B5EE8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7B5EE8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,78 C40,74 60,66 90,60 C120,54 140,40 175,33 C210,26 240,16 300,8 L300,90 L0,90 Z" fill="url(#rev)" />
          <path d="M0,78 C40,74 60,66 90,60 C120,54 140,40 175,33 C210,26 240,16 300,8" fill="none" stroke="#7B5EE8" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

const FEED = [
  { id: "#4821", city: "Cape Town", amount: "R349.00", status: "Delivered", tone: "text-emerald-300 bg-emerald-500/15" },
  { id: "#4820", city: "Johannesburg", amount: "R612.00", status: "In transit", tone: "text-sky-300 bg-sky-500/15" },
  { id: "#4819", city: "Durban", amount: "R248.00", status: "Delivered", tone: "text-emerald-300 bg-emerald-500/15" },
  { id: "#4818", city: "Pretoria", amount: "R815.00", status: "Processing", tone: "text-[#b9a6ff] bg-[color:var(--primary)]/20" },
];

function OrderFeedMock() {
  return (
    <div className="glass h-full p-5 md:p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Vault · Live order feed
        </span>
        <span className="text-[11px] text-[#71717A]">47 active today</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {FEED.slice(0, 4).map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--primary)]/15 text-[color:var(--primary)]"><Truck className="h-4 w-4" /></span>
              <div>
                <div className="text-sm font-semibold text-white">Order {o.id} · {o.city}</div>
                <div className="text-[11px] text-[#71717A]">{o.amount}</div>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${o.tone}`}>{o.status}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-[#71717A]">Every order shipped direct to your customer · tracked live</p>
    </div>
  );
}

const VALUES = [
  { icon: Wallet, value: "R99", label: "Once-off, lifetime access, no subscriptions" },
  { icon: MapPin, value: "Local", label: "SA suppliers and nationwide delivery" },
  { icon: PackageSearch, value: "Zero", label: "Stock to buy or hold up front" },
  { icon: Repeat, value: "Weekly", label: "New winning products added" },
];

function ValueProps() {
  return (
    <section className="relative px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v, i) => (
          <Reveal key={v.label} delay={i * 70}>
            <div className="glass flex h-full flex-col p-6">
              <v.icon className="h-5 w-5 text-[#7B5EE8]" />
              <div className="mt-4 text-3xl font-bold tracking-tight text-white">{v.value}</div>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">{v.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const features = [
    "Full private product catalogue access",
    "Weekly new winning products added",
    "Cost prices + suggested sell prices",
    "Order fulfilment, we ship to your customer",
    "Live order tracking in your dashboard",
    "Request products we don't stock yet",
    "Products validated for the SA market",
    "One payment, lifetime access, no subscriptions",
  ];
  return (
    <section id="pricing" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-md">
        <Reveal className="text-center">
          <SectionEyebrow text="Pricing" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">One plan. Everything included.</h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="glass mt-10 p-8" style={{ border: "1px solid rgba(107,79,232,0.5)", boxShadow: "0 0 40px rgba(107,79,232,0.2)" }}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#7B5EE8]">Member access</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight text-white">R99</span>
              <span className="text-sm text-[#A1A1AA]">once-off</span>
            </div>
            <p className="mt-2 text-sm text-[#A1A1AA]">Everything you need to launch and scale your SA dropshipping store.</p>
            <ul className="mt-8 space-y-3.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(107,79,232,0.2)] text-[#7B5EE8]"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  <span className="text-sm text-white">{f}</span>
                </li>
              ))}
            </ul>
            <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="glass-pill-purple mt-8 flex w-full items-center justify-center gap-2 px-6 py-4 text-base">Get instant access</a>
            <p className="mt-4 text-center text-xs text-[#A1A1AA]">One payment · Lifetime access</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "What exactly do I get for R99?", a: "Lifetime access to the private product catalogue, cost prices, suggested sell prices and descriptions, plus the ability to order for your customers and have us ship to them. One payment, no subscriptions." },
  { q: "How does fulfilment work?", a: "When you make a sale, you order the product from us at the cost price and enter your customer's delivery details. We ship it straight to them, anywhere in South Africa, and you track it from your dashboard." },
  { q: "Do I need to hold stock?", a: "No. You only order once you've made a sale, so there's no stock to buy up front and nothing to store." },
  { q: "What if a product I want isn't listed?", a: "Use the Request a Product tool inside the portal. We source it from a vetted SA supplier and send you a quote, usually within 48 hours." },
];

function FAQ() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <SectionEyebrow text="FAQ" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Good questions, straight answers.</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group glass overflow-hidden px-5 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-left font-medium text-white">
                  {f.q}
                  <span className="ml-4 text-[#7B5EE8] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-[#A1A1AA]">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ text }: { text: string }) {
  return (
    <div className="glass-pill inline-flex items-center gap-2 px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#7B5EE8]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">{text}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-[#A1A1AA]">© 2026 ZA Supplier Hub · South Africa</p>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/login" className="glass-pill px-4 py-1.5">Member Login</Link>
          <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer" className="glass-pill px-4 py-1.5">WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}
