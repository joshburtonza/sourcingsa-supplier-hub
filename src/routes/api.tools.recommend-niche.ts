import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAos, extractJson, AosError } from "@/lib/aos.server";

/**
 * POST /api/tools/recommend-niche
 *
 * One-click recommendation for the Find Products page: picks ONE strong SA
 * niche (constrained to the hub catalogue) and returns N products from it,
 * where N is sized to the member's package tier (4 / 6 / 8). Member-gated.
 */

// Products returned per package tier. Adjust here if the package model changes.
const TIER_COUNT: Record<string, number> = {
  starter: 4,
  growth: 6,
  elite: 8,
  owner: 8,
  payg: 4,
};
const DEFAULT_COUNT = 4;

type Niche = { name: string; fit: string; category: string; adAngle: string; risk: string; riskLevel: "low" | "medium" | "high" };

const SYSTEM = `You are the ZA Supplier Hub niche advisor for South African dropshippers.
Pick the SINGLE best niche, chosen from the supplier catalogue categories provided. If the member describes what they want, choose the catalogue category that best fits their request; otherwise pick the strongest overall opportunity.

OUTPUT ONE VALID JSON OBJECT ONLY. No prose, no code fences. Start with { end with }.
{
  "niche": {
    "name": "<short niche name>",
    "fit": "<two sentences: why this niche wins in SA right now>",
    "category": "<EXACT value copied from the CATALOGUE CATEGORIES list>",
    "adAngle": "<one punchy ad hook>",
    "risk": "<one sentence main risk>",
    "riskLevel": "low"
  }
}
"category" MUST be copied verbatim from the provided list. riskLevel is low|medium|high. No em dashes.`;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/tools/recommend-niche")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ ok: false, error: "Please sign in again." }, 401);

        const admin = supabaseAdmin as unknown as {
          auth: { getUser: (t: string) => Promise<{ data: { user: { id: string } | null } }> };
          from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        const { data: u } = await admin.auth.getUser(token);
        if (!u?.user) return json({ ok: false, error: "Please sign in again." }, 401);

        // package tier -> product count
        const { data: prof } = await admin.from("profiles").select("dropstore_tier").eq("id", u.user.id).maybeSingle();
        const tier = String((prof as { dropstore_tier?: string } | null)?.dropstore_tier ?? "").toLowerCase();
        const count = TIER_COUNT[tier] ?? DEFAULT_COUNT;

        const body = (await request.json().catch(() => ({}))) as { interests?: string };
        const interests = String(body.interests ?? "").trim().slice(0, 400);

        // catalogue categories
        const { data: catRows } = await admin.from("products").select("category").eq("active", true);
        const categories = [...new Set((catRows ?? []).map((r: { category: string }) => String(r.category)))].sort();
        if (categories.length === 0) return json({ ok: false, error: "Catalogue is empty." }, 500);

        const prompt = `${interests ? `Member's request (match the closest category): ${interests}` : "Member has no specific preference; pick the strongest opportunity."}\n\nCATALOGUE CATEGORIES (copy "category" verbatim from this list):\n${categories.join("\n")}`;

        let parsed: { niche: Niche } | null = null;
        let lastRaw = "";
        for (let attempt = 0; attempt < 2 && !parsed?.niche?.category; attempt += 1) {
          const p = attempt === 0 ? prompt : `${prompt}\n\nIMPORTANT: previous reply was not valid JSON. Reply with ONLY the JSON object.`;
          try {
            lastRaw = await callAos(SYSTEM, p);
          } catch (e) {
            const err = e as AosError;
            return json({ ok: false, error: err.message ?? "AI service error." }, err.status ?? 502);
          }
          parsed = extractJson<{ niche: Niche }>(lastRaw);
        }
        if (!parsed?.niche?.category) {
          console.error("[recommend-niche] unparseable", lastRaw.slice(0, 200));
          return json({ ok: false, error: "Couldn't generate a recommendation. Try again." }, 502);
        }

        // N products from the niche category, best sellers first
        const { data: prods } = await admin
          .from("products")
          .select("id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,variant_options,variant_map,description,stock_status,sales_count,trending")
          .eq("active", true)
          .eq("category", parsed.niche.category)
          .order("sales_count", { ascending: false })
          .limit(count);

        return json({ ok: true, niche: parsed.niche, products: prods ?? [], count, tier: tier || null });
      },
    },
  },
});
