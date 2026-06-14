import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CARD_COLS =
  "id,name,category,cost_price,sell_price,image_url,images,shopify_url,checkout_url,variant_options,variant_map,description,stock_status,active,sales_count,trending";
const PAGE_SIZE = 48;

const PRICE_RANGES = [
  { min: 0, max: null },
  { min: 0, max: 200 },
  { min: 200, max: 500 },
  { min: 500, max: 1000 },
  { min: 1000, max: null },
];

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function searchTerms(value: string): string[] {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  return [...new Set([cleaned, ...cleaned.split(" ").filter((term) => term.length > 2)])].slice(0, 6);
}

function orSafe(term: string): string {
  return term.replace(/[%,().]/g, " ").replace(/\s+/g, " ").trim();
}

export const Route = createFileRoute("/api/products/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return json({ ok: false, error: "Please sign in again." }, 401);

        const admin = supabaseAdmin as unknown as {
          auth: { getUser: (t: string) => Promise<{ data: { user: { id: string } | null }; error?: unknown }> };
          from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        const { data: userData, error: authErr } = await admin.auth.getUser(token);
        if (authErr) {
          // Auth-service error (outage / rate-limit / network) is NOT a bad token.
          // 503 routes the client into its generic retry, not the 401 force-refresh
          // path (which would burn the retry and re-create the silent kick).
          console.error("[products-search] token validation failed", String((authErr as { message?: string })?.message ?? authErr));
          return json({ ok: false, error: "Couldn't verify your session just now. Please try again." }, 503);
        }
        const userId = userData?.user?.id;
        if (!userId) return json({ ok: false, error: "Please sign in again." }, 401);

        const { data: roles, error: rolesErr } = await admin.from("user_roles").select("role").eq("user_id", userId);
        if (rolesErr) {
          console.error("[products-search] role read failed", String((rolesErr as { message?: string })?.message ?? rolesErr));
          return json({ ok: false, error: "Couldn't verify your access just now. Please try again." }, 503);
        }
        const approved = ((roles as Array<{ role: string }> | null) ?? []).some((r) => r.role === "approved" || r.role === "admin");
        if (!approved) return json({ ok: false, error: "Your account is pending approval." }, 403);

        const body = (await request.json().catch(() => ({}))) as {
          category?: string;
          priceIdx?: number;
          search?: string;
          trendingOnly?: boolean;
          page?: number;
        };
        const page = Math.max(0, Math.floor(Number(body.page ?? 0)));
        const price = PRICE_RANGES[Math.max(0, Math.min(PRICE_RANGES.length - 1, Number(body.priceIdx ?? 0)))] ?? PRICE_RANGES[0];
        const category = String(body.category ?? "All");
        const terms = searchTerms(String(body.search ?? ""));

        let query = admin.from("products").select(CARD_COLS).eq("active", true);
        if (body.trendingOnly) query = query.eq("trending", true);
        if (category && category !== "All") query = query.eq("category", category);
        if (terms.length) {
          const clauses = terms
            .map(orSafe)
            .filter(Boolean)
            .flatMap((term) => [`name.ilike.%${term}%`, `category.ilike.%${term}%`, `description.ilike.%${term}%`]);
          if (clauses.length) query = query.or(clauses.join(","));
        }
        if (price.min > 0) query = query.gte("cost_price", price.min);
        if (price.max !== null) query = query.lte("cost_price", price.max);

        const { data, error } = await query
          .order("sales_count", { ascending: false })
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          console.error("[products-search] load failed", error.message);
          return json({ ok: false, error: "Couldn't load products. Please try again." }, 500);
        }

        const products = data ?? [];
        // Diagnostic: turns a "category shows blank" report into a one-line log
        // (which category + filters + row count) instead of guesswork. No PII —
        // user id prefix only, never email.
        console.log(
          `[products-search] ok user=${userId.slice(0, 8)} cat=${JSON.stringify(category)} ` +
            `price=${Number(body.priceIdx ?? 0)} trending=${Boolean(body.trendingOnly)} page=${page} ` +
            `terms=${terms.length} -> ${products.length} rows`,
        );
        return json({ ok: true, products, hasMore: products.length === PAGE_SIZE });
      },
    },
  },
});
