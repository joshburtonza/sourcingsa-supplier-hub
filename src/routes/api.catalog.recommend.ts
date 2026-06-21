import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAos, extractJson, AosError } from "@/lib/aos.server";

/**
 * POST /api/catalog/recommend
 *
 * Cross-app recommendation endpoint. Lets DropStore (or any trusted Amalfi app)
 * get a niche + N real ZA Supplier Hub products sized to a member's package
 * tier. Authenticated with a shared secret (X-Catalog-Secret), NOT member auth,
 * because the caller is a server (DropStore), not a hub member.
 *
 * Body: { tier?: "starter"|"growth"|"elite"|... }
 * Returns: { ok, niche, products:[{ id, name, image_url, cost_price, sell_price,
 *            checkout_url, variant_options, variant_map, hub_url }], count, tier }
 */

const HUB_ORIGIN = "https://zasupplierhub.josh-338.workers.dev";
const TIER_COUNT: Record<string, number> = { starter: 4, growth: 6, elite: 8, owner: 8, payg: 4 };
const DEFAULT_COUNT = 4;

type Niche = { name: string; fit: string; category: string; adAngle: string; risk: string; riskLevel: "low" | "medium" | "high" };

const SYSTEM = `You are the ZA Supplier Hub niche advisor for South African dropshippers.
Pick the SINGLE best niche, chosen from the supplier catalogue categories provided. If the member describes what they want, choose the catalogue category that best fits their request; otherwise pick the strongest overall opportunity.
OUTPUT ONE VALID JSON OBJECT ONLY. No prose, no code fences. Start with { end with }.
{ "niche": { "name": "<short>", "fit": "<two sentences why this wins in SA now>", "category": "<EXACT from list>", "adAngle": "<hook>", "risk": "<one sentence>", "riskLevel": "low" } }
"category" MUST be copied verbatim from the provided list. riskLevel is low|medium|high. No em dashes.`;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const Route = createFileRoute("/api/catalog/recommend")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, X-Catalog-Secret",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
      POST: async ({ request }) => {
        const secret = request.headers.get("x-catalog-secret") ?? "";
        const expected = process.env.CATALOG_SHARED_SECRET ?? "";
        if (!expected || secret !== expected) return json({ ok: false, error: "unauthorized" }, 401);

        const body = (await request.json().catch(() => ({}))) as { tier?: string; interests?: string };
        const tier = String(body.tier ?? "").toLowerCase();
        const count = TIER_COUNT[tier] ?? DEFAULT_COUNT;
        const interests = String(body.interests ?? "").trim().slice(0, 400);

        const admin = supabaseAdmin as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
        const { data: catRows } = await admin.from("products").select("category").eq("active", true);
        const categories = [...new Set((catRows ?? []).map((r: { category: string }) => String(r.category)))].sort();
        if (categories.length === 0) return json({ ok: false, error: "Catalogue empty." }, 500);

        const prompt = `${interests ? `Member's request (match the closest category): ${interests}` : "Member has no specific preference; pick the strongest opportunity."}\n\nCATALOGUE CATEGORIES (copy "category" verbatim):\n${categories.join("\n")}`;
        let parsed: { niche: Niche } | null = null;
        let lastRaw = "";
        for (let attempt = 0; attempt < 2 && !parsed?.niche?.category; attempt += 1) {
          const p = attempt === 0 ? prompt : `${prompt}\n\nIMPORTANT: previous reply was not valid JSON. Reply with ONLY the JSON object.`;
          try {
            lastRaw = await callAos(SYSTEM, p);
          } catch (e) {
            const err = e as AosError;
            return json({ ok: false, error: err.message ?? "AI error." }, err.status ?? 502);
          }
          parsed = extractJson<{ niche: Niche }>(lastRaw);
        }
        if (!parsed?.niche?.category) return json({ ok: false, error: "Could not generate a recommendation." }, 502);

        const { data: prods } = await admin
          .from("products")
          .select("id,name,category,cost_price,sell_price,image_url,checkout_url,variant_options,variant_map")
          .eq("active", true)
          .eq("category", parsed.niche.category)
          .order("sales_count", { ascending: false })
          .limit(count);

        const products = (prods ?? []).map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          cost_price: p.cost_price,
          sell_price: p.sell_price,
          checkout_url: p.checkout_url,
          variant_options: p.variant_options,
          variant_map: p.variant_map,
          hub_url: `${HUB_ORIGIN}/product/${p.id}`,
        }));

        return json({ ok: true, niche: parsed.niche, products, count, tier: tier || null });
      },
    },
  },
});
