import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Shopify `orders/paid` webhook handler.
 *
 * Records the paying customer's email into `public.paid_customers` so the
 * payment-gated signup (`register_paid_user`) will let them create an
 * account. We do NOT create the account here, the customer sets their own
 * password at /signup after paying.
 *
 * Configure in Shopify Admin -> Settings -> Notifications -> Webhooks:
 *   Event: Order payment
 *   Format: JSON
 *   URL:    https://<deployed-domain>/api/webhooks/shopify/orders-paid
 *
 * Required env vars on the deploy target (Cloudflare Workers vars):
 *   - SHOPIFY_WEBHOOK_SECRET      Verifies the X-Shopify-Hmac-Sha256 header.
 *   - SUPABASE_URL                (client.server.ts)
 *   - SUPABASE_SERVICE_ROLE_KEY   Writes paid_customers (bypasses RLS).
 *
 * Returns 200 on success, 401 on bad HMAC, 200 on non-fatal errors so
 * Shopify's retry loop doesn't hammer + clobber logs.
 */

export const Route = createFileRoute("/api/webhooks/shopify/orders-paid")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[shopify-webhook] SHOPIFY_WEBHOOK_SECRET is not set, refusing.");
          return new Response("Server not configured", { status: 500 });
        }

        // HMAC must be computed against the exact bytes Shopify signed.
        const raw = await request.text();
        const headerSig = request.headers.get("x-shopify-hmac-sha256") ?? "";

        const valid = await verifyShopifyHmac(raw, headerSig, secret);
        if (!valid) {
          console.error("[shopify-webhook] HMAC mismatch, rejecting.");
          return new Response("Invalid signature", { status: 401 });
        }

        let order: ShopifyOrder;
        try {
          order = JSON.parse(raw) as ShopifyOrder;
        } catch (err) {
          console.error("[shopify-webhook] Body not JSON", err);
          return new Response("Bad payload", { status: 400 });
        }

        const email = (order.customer?.email ?? order.email ?? "").trim().toLowerCase();
        if (!email) {
          console.error("[shopify-webhook] No customer email on order", { id: order.id });
          return new Response("No email on order", { status: 200 });
        }

        // 1) Entitlement: record the paid email so they can sign up (membership).
        try {
          await recordPayment({
            email,
            orderId: String(order.id ?? ""),
            amount: parseAmount(order.total_price ?? order.current_total_price),
            currency: order.currency ?? null,
          });
        } catch (err) {
          console.error("[shopify-webhook] recording payment failed", {
            email,
            orderId: order.id,
            err: err instanceof Error ? err.message : err,
          });
        }

        // 2) Order sync: write product line items into the hub so the member's
        //    dashboard + Orders reflect the purchase. Attributed to the hub
        //    login via the ZASH:<email> note. Never fails the webhook.
        try {
          await recordHubOrders(order, hubEmailFromOrder(order, email));
        } catch (err) {
          console.error("[shopify-webhook] hub order sync failed", {
            orderId: order.id,
            err: err instanceof Error ? err.message : err,
          });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

/* ─────────────────────────── Helpers ─────────────────────────── */

type ShopifyLineItem = {
  title?: string;
  quantity?: number;
  price?: string | number;
  variant_id?: number | string;
  product_id?: number | string;
  variant_title?: string | null;
};
type ShopifyOrder = {
  id?: number | string;
  name?: string;
  note?: string | null;
  email?: string;
  customer?: { email?: string; first_name?: string; last_name?: string };
  total_price?: string | number;
  current_total_price?: string | number;
  currency?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  created_at?: string;
  line_items?: ShopifyLineItem[];
  shipping_address?: {
    name?: string;
    address1?: string;
    city?: string;
    province?: string;
    zip?: string;
    phone?: string;
  };
  [key: string]: unknown;
};

// The R99 "Get Access" membership product is not a "product order" a member
// tracks. Match by both variant and product id (variants can change if the
// product is recreated). These are the live "Get Access" identifiers.
const ACCESS_VARIANT_IDS = new Set(["51717612273981", "51793619550525"]);
const ACCESS_PRODUCT_ID = "10346097967421";

/** Hub member email is carried through Shopify checkout as `note=ZASH:<email>`
 *  so an order attributes to the member's hub login even if they use a
 *  different contact email at checkout. Falls back to the buyer email. */
function hubEmailFromOrder(order: ShopifyOrder, buyerEmail: string): string {
  const m = (order.note ?? "").match(/ZASH:([^\s,;]+@[^\s,;]+)/i);
  return (m ? m[1] : buyerEmail).trim().toLowerCase();
}

function parseAmount(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseSelectionLabel(raw: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(raw ?? "").split(/\s*\/\s*/)) {
    const m = part.match(/^\s*([^:]+):\s*(.+?)\s*$/);
    if (m?.[1] && m?.[2]) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function selectionFromOrderNote(order: ShopifyOrder, item: ShopifyLineItem): Record<string, string> {
  const note = order.note ?? "";
  const title = item.title ?? "";
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const itemMatch = note.match(new RegExp(`${escaped}\\s*\\(([^)]*:[^)]*)\\)`, "i"));
  if (itemMatch?.[1]) return parseSelectionLabel(itemMatch[1]);

  if ((order.line_items ?? []).length === 1) {
    const direct = note
      .split("|")
      .map((p) => p.trim())
      .find((p) => /[^:]+:\s*[^:]+/.test(p) && !/^ZASH:/i.test(p) && !/^Selections:/i.test(p));
    const parsed = parseSelectionLabel(direct);
    if (Object.keys(parsed).length) return parsed;
  }

  if (item.variant_title && !/^default title$/i.test(item.variant_title)) {
    return { Option: item.variant_title };
  }
  return {};
}

/**
 * Upsert the paid email into paid_customers (idempotent on the email PK, so
 * Shopify's at-least-once delivery is effectively at-most-once). Never
 * overwrites consumed_at, so re-delivery of an old order can't reset an
 * already-activated member.
 */
async function recordPayment(args: {
  email: string;
  orderId: string;
  amount: number | null;
  currency: string | null;
}): Promise<void> {
  const { email, orderId, amount, currency } = args;
  const { error } = await (
    supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("paid_customers")
    .upsert(
      { email, shopify_order_id: orderId, amount, currency },
      { onConflict: "email" },
    );

  if (error) throw new Error(`paid_customers upsert failed: ${error.message}`);
}

/**
 * Write each purchased product line item into public.orders so the member's
 * hub dashboard + Orders page reflect the purchase. Idempotent on
 * shopify_order_id (Shopify delivers at-least-once). Skips the membership
 * access product. Uses the service-role client (bypasses RLS).
 */
async function recordHubOrders(order: ShopifyOrder, hubEmail: string): Promise<void> {
  const orderId = String(order.id ?? "");
  if (!orderId || !hubEmail) return;

  const items = (order.line_items ?? []).filter(
    (li) =>
      !ACCESS_VARIANT_IDS.has(String(li.variant_id ?? "")) &&
      String(li.product_id ?? "") !== ACCESS_PRODUCT_ID,
  );
  if (items.length === 0) return; // membership-only order, nothing to track

  const sa = order.shipping_address ?? {};
  const cust = order.customer ?? {};
  const customerName =
    (sa.name ?? `${cust.first_name ?? ""} ${cust.last_name ?? ""}`).trim() || null;
  const status = order.fulfillment_status === "fulfilled" ? "in_transit" : "processing";

  const rows = items.map((li) => {
    const qty = Math.max(1, Number(li.quantity ?? 1));
    const unit = Number(li.price ?? 0);
    return {
      email: hubEmail,
      product_name: li.title ?? "Order",
      quantity: qty,
      unit_cost: unit,
      amount: unit * qty,
      status,
      paid: true,
      variant_selection: selectionFromOrderNote(order, li),
      customer_name: customerName,
      customer_email: (order.email ?? "").toLowerCase() || null,
      shipping_address: sa.address1 ?? null,
      shipping_city: sa.city ?? null,
      shipping_province: sa.province ?? null,
      shipping_postal_code: sa.zip ?? null,
      shopify_order_id: orderId,
      notes: order.note ?? null,
      ordered_at: order.created_at ?? undefined,
    };
  });

  const admin = supabaseAdmin as unknown as {
    from: (t: string) => {
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    };
  };
  await admin.from("orders").delete().eq("shopify_order_id", orderId);
  const { error } = await admin.from("orders").insert(rows);
  if (error) throw new Error(`orders insert failed: ${error.message}`);
}

/**
 * HMAC-SHA256(body, secret) -> base64, compared in constant time against
 * the X-Shopify-Hmac-Sha256 header. Web Crypto so it runs on Workers.
 */
async function verifyShopifyHmac(rawBody: string, headerSig: string, secret: string): Promise<boolean> {
  if (!headerSig) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const computed = bufferToBase64(sigBuf);
    return constantTimeEqual(computed, headerSig);
  } catch (err) {
    console.error("[shopify-webhook] HMAC compute failed", err);
    return false;
  }
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
