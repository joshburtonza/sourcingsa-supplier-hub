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

        try {
          await recordPayment({
            email,
            orderId: String(order.id ?? ""),
            amount: parseAmount(order.total_price ?? order.current_total_price),
            currency: order.currency ?? null,
          });
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[shopify-webhook] recording payment failed", {
            email,
            orderId: order.id,
            err: err instanceof Error ? err.message : err,
          });
          // 200 so Shopify stops retrying; loud log for reconciliation.
          return new Response("ok-with-warning", { status: 200 });
        }
      },
    },
  },
});

/* ─────────────────────────── Helpers ─────────────────────────── */

type ShopifyOrder = {
  id?: number | string;
  email?: string;
  customer?: { email?: string };
  total_price?: string | number;
  current_total_price?: string | number;
  currency?: string;
  [key: string]: unknown;
};

function parseAmount(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
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
