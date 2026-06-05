import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAos, extractJson, AosError } from "@/lib/aos.server";

/**
 * POST /api/tools/ai-tool  { tool, input }
 *
 * Shared backend for the AI Studio JSON tools (product_validator, ad_generator).
 * Member-gated (Authorization: Bearer). Asks AOS Claude for structured JSON,
 * retries once on non-JSON output.
 */

type Tool = "product_validator" | "ad_generator";

const SYSTEM: Record<Tool, string> = {
  product_validator: `You are the ZA Supplier Hub Product Validator for South African dropshippers. Score the given product across exactly 24 criteria (8 categories x 3) on a 0-10 integer scale, one sentence per score.
OUTPUT ONE VALID JSON OBJECT ONLY. No prose, no code fences, no markdown inside strings. Start with { end with }.
{
  "productName": "<concise name>",
  "context": "South African dropshipping",
  "categories": [
    { "name": "Margin", "criteria": [ {"name":"Retail price headroom","score":0,"note":""},{"name":"Supplier landed cost","score":0,"note":""},{"name":"Perceived value","score":0,"note":""} ] },
    { "name": "Virality", "criteria": [ {"name":"Hook-ability","score":0,"note":""},{"name":"Scroll-stop visual","score":0,"note":""},{"name":"Novelty","score":0,"note":""} ] },
    { "name": "Supplier risk", "criteria": [ {"name":"SA delivery feasibility","score":0,"note":""},{"name":"Supplier reliability","score":0,"note":""},{"name":"Customs / compliance","score":0,"note":""} ] },
    { "name": "Demand", "criteria": [ {"name":"Search interest","score":0,"note":""},{"name":"Trend trajectory","score":0,"note":""},{"name":"Audience size","score":0,"note":""} ] },
    { "name": "Competition", "criteria": [ {"name":"SA saturation","score":0,"note":""},{"name":"Differentiation room","score":0,"note":""},{"name":"Existing winning ads","score":0,"note":""} ] },
    { "name": "Operations", "criteria": [ {"name":"Unit weight","score":0,"note":""},{"name":"Returns rate risk","score":0,"note":""},{"name":"Packaging fragility","score":0,"note":""} ] },
    { "name": "Audience fit", "criteria": [ {"name":"Target clarity","score":0,"note":""},{"name":"Channel match","score":0,"note":""},{"name":"Spend-power match","score":0,"note":""} ] },
    { "name": "Risk", "criteria": [ {"name":"Legal / health claims","score":0,"note":""},{"name":"IP risk","score":0,"note":""},{"name":"Seasonal swing","score":0,"note":""} ] }
  ],
  "overall": 0,
  "verdict": "<one sentence>",
  "topActions": ["<action 1>","<action 2>","<action 3>"]
}
No em dashes.`,
  ad_generator: `You are the ZA Supplier Hub Ad Generator for South African dropshippers. For the given product, write 3 short ad scripts: one for TikTok, one for Instagram Reels, one for Meta (Facebook/Instagram feed).
OUTPUT ONE VALID JSON OBJECT ONLY. No prose, no code fences. Start with { end with }.
{
  "product": "<concise product name>",
  "audience": "<one line target audience>",
  "scripts": [
    { "platform": "TikTok", "hook": "<3-5 word scroll-stopper>", "body": "<2-3 sentence script>", "cta": "<call to action>", "overlays": ["<on-screen text 1>","<2>","<3>"] },
    { "platform": "Reels", "hook": "", "body": "", "cta": "", "overlays": [] },
    { "platform": "Meta", "hook": "", "body": "", "cta": "", "overlays": [] }
  ]
}
Punchy, SA-market tone. No em dashes.`,
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/tools/ai-tool")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ ok: false, error: "Please sign in again." }, 401);
        const admin = supabaseAdmin as unknown as { auth: { getUser: (t: string) => Promise<{ data: { user: { id: string } | null } }> } };
        const { data: u } = await admin.auth.getUser(token);
        if (!u?.user) return json({ ok: false, error: "Please sign in again." }, 401);

        const body = (await request.json().catch(() => ({}))) as { tool?: string; input?: string };
        const tool = body.tool as Tool;
        const input = String(body.input ?? "").trim().slice(0, 800);
        if (!SYSTEM[tool]) return json({ ok: false, error: "Unknown tool." }, 400);
        if (!input) return json({ ok: false, error: "Describe the product first." }, 400);

        let parsed: unknown = null;
        let lastRaw = "";
        for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
          const prompt =
            (attempt === 0 ? "" : "Your previous reply was not valid JSON. Reply with ONLY the JSON object.\n\n") +
            `Product: ${input}`;
          try {
            lastRaw = await callAos(SYSTEM[tool], prompt);
          } catch (e) {
            const err = e as AosError;
            return json({ ok: false, error: err.message ?? "AI error." }, err.status ?? 502);
          }
          parsed = extractJson(lastRaw);
        }
        if (!parsed) {
          console.error("[ai-tool] unparseable", tool, lastRaw.slice(0, 200));
          return json({ ok: false, error: "The AI returned an unexpected response. Please try again." }, 502);
        }
        return json({ ok: true, type: tool, result: parsed });
      },
    },
  },
});
