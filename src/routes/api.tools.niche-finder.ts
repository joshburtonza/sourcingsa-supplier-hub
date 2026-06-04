import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAos, extractJson, AosError } from "@/lib/aos.server";

/**
 * POST /api/tools/niche-finder
 *
 * Catalog-aware niche finder. Asks AOS Claude for 3 SA dropshipping niches that
 * fit the member's input, constrained to the hub's actual catalogue categories,
 * then attaches real in-stock products from each niche so the result recommends
 * things the member can order right now.
 *
 * Member-gated: requires a valid Supabase access token (Authorization: Bearer).
 */

type Niche = {
  rank: number;
  name: string;
  fit: string;
  category: string;
  adAngle: string;
  risk: string;
  riskLevel: "low" | "medium" | "high";
};

const SYSTEM = `You are the ZA Supplier Hub Niche Finder, advising South African dropshippers.
Given the member's interests/budget/experience, propose exactly 3 niches that sell well in South Africa AND map to the supplier catalogue.

YOUR ENTIRE OUTPUT MUST BE ONE VALID JSON OBJECT. No prose, no markdown, no code fences. Start with { and end with }.

{
  "niches": [
    {
      "rank": 1,
      "name": "<short niche name>",
      "fit": "<one sentence on why it fits this member + the SA market>",
      "category": "<EXACT value copied from the CATALOGUE CATEGORIES list>",
      "adAngle": "<one punchy ad angle / hook>",
      "risk": "<one sentence on the main risk>",
      "riskLevel": "low"
    }
  ]
}

Rules:
- Exactly 3 niches, ranked 1-3 best first.
- "category" MUST be copied verbatim from the CATALOGUE CATEGORIES list provided, so we can recommend real in-stock products. Never invent a category.
- riskLevel is one of: low, medium, high.
- Keep every string tight and concrete. No em dashes.`;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/tools/niche-finder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ ok: false, error: "Please sign in again." }, 401);

        const admin = supabaseAdmin as unknown as {
          auth: { getUser: (t: string) => Promise<{ data: { user: { id: string } | null } }> };
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: unknown) => {
                limit?: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }>;
                eq?: (col: string, val: unknown) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> };
              } & Promise<{ data: Array<Record<string, unknown>> | null }>;
            };
          };
        };

        const { data: u } = await admin.auth.getUser(token);
        if (!u?.user) return json({ ok: false, error: "Please sign in again." }, 401);

        const body = (await request.json().catch(() => ({}))) as { interests?: string };
        const interests = String(body.interests ?? "").trim().slice(0, 600);
        if (!interests) return json({ ok: false, error: "Tell us a bit about what you want to sell." }, 400);

        // catalogue categories (active products only)
        const { data: catRows } = await admin.from("products").select("category").eq("active", true);
        const categories = [...new Set((catRows ?? []).map((r) => String(r.category)))].sort();
        if (categories.length === 0) return json({ ok: false, error: "Catalogue is empty." }, 500);

        const basePrompt = `Member interests / situation:\n${interests}\n\nCATALOGUE CATEGORIES (copy "category" values ONLY from this list):\n${categories.join("\n")}`;

        // Claude occasionally wraps JSON in prose; retry once with a harder nudge.
        let parsed: { niches: Niche[] } | null = null;
        let lastRaw = "";
        for (let attempt = 0; attempt < 2 && !parsed?.niches?.length; attempt += 1) {
          const prompt =
            attempt === 0
              ? basePrompt
              : `${basePrompt}\n\nIMPORTANT: Your previous reply was not valid JSON. Reply with ONLY the JSON object, starting with { and ending with }. No prose, no code fences.`;
          try {
            lastRaw = await callAos(SYSTEM, prompt);
          } catch (e) {
            const err = e as AosError;
            return json({ ok: false, error: err.message ?? "AI service error." }, err.status ?? 502);
          }
          parsed = extractJson<{ niches: Niche[] }>(lastRaw);
        }
        if (!parsed?.niches?.length) {
          console.error("[niche-finder] unparseable AOS reply", lastRaw.slice(0, 300));
          return json({ ok: false, error: "The AI returned an unexpected response. Please try again." }, 502);
        }

        // attach real in-stock products per niche
        const niches = [];
        for (const n of parsed.niches.slice(0, 3)) {
          const { data: prods } = await admin
            .from("products")
            .select("id,name,image_url,cost_price,sell_price,category")
            .eq("active", true)
            .eq("category", n.category)
            .limit(3) as { data: Array<Record<string, unknown>> | null };
          niches.push({ ...n, products: prods ?? [] });
        }

        return json({ ok: true, niches });
      },
    },
  },
});
