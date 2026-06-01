import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Shopify `orders/paid` webhook handler.
 *
 * Configure in Shopify Admin → Settings → Notifications → Webhooks:
 *   Event: Order payment
 *   Format: JSON
 *   URL:    https://<your-deployed-domain>/api/webhooks/shopify/orders-paid
 *
 * Required env vars (set in the deploy target — Cloudflare Workers vars,
 * Vercel env, or wherever this ships):
 *   - SHOPIFY_WEBHOOK_SECRET      Shopify's webhook signing secret. Used
 *                                 to verify the X-Shopify-Hmac-Sha256
 *                                 header against the raw request body.
 *   - SUPABASE_URL                Already required by client.server.ts.
 *   - SUPABASE_SERVICE_ROLE_KEY   Service-role key (bypasses RLS). Used
 *                                 to provision the auth user + grant
 *                                 the approved role.
 *
 * Flow:
 *   1. Verify HMAC signature against the raw body (Shopify spec).
 *   2. Parse the order JSON, extract the customer's email.
 *   3. Find or create the auth.users row for that email
 *      (`supabaseAdmin.auth.admin.createUser` with email_confirm:true so
 *       they don't need to confirm before the magic-link sign-in works).
 *   4. Grant `approved` role on `user_roles` (idempotent on the
 *      composite unique key, so retries don't double-insert).
 *   5. Send a magic link to that email so they can sign in.
 *
 * Returns 200 on success. Returns 401 on bad HMAC. Returns 200 on most
 * non-fatal errors (e.g. user already provisioned) so Shopify doesn't
 * retry forever; logs loudly for debugging.
 */

export const Route = createFileRoute("/api/webhooks/shopify/orders-paid")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[shopify-webhook] SHOPIFY_WEBHOOK_SECRET is not set — refusing.");
          return new Response("Server not configured", { status: 500 });
        }

        // Read the raw body BEFORE parsing — HMAC must be computed
        // against the exact bytes Shopify signed.
        const raw = await request.text();
        const headerSig = request.headers.get("x-shopify-hmac-sha256") ?? "";

        const valid = await verifyShopifyHmac(raw, headerSig, secret);
        if (!valid) {
          console.error("[shopify-webhook] HMAC mismatch — rejecting.");
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
          // 200 so Shopify stops retrying — we can't action this order.
          return new Response("No email on order", { status: 200 });
        }

        try {
          await provisionApprovedMember({ email, orderId: String(order.id ?? "") });
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[shopify-webhook] provisioning failed", {
            email,
            orderId: order.id,
            err: err instanceof Error ? err.message : err,
          });
          // Still 200: a provisioning bug shouldn't trigger Shopify's
          // retry loop (which clobbers logs). We rely on the loud
          // console.error + the eventual admin-side reconciliation.
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
  [key: string]: unknown;
};

/**
 * HMAC-SHA256(body, secret) → base64. Compared in constant-time
 * against the X-Shopify-Hmac-Sha256 header. Uses Web Crypto so it
 * runs on Cloudflare Workers and Vercel Functions alike.
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

/**
 * Idempotent member provisioning. Creates the auth user if missing
 * (email pre-confirmed so a one-click magic link works), then grants
 * `approved` on user_roles. The UNIQUE(user_id, role) constraint on
 * user_roles makes the insert a no-op on retries — Shopify's at-least-
 * once delivery becomes effectively at-most-once.
 */
async function provisionApprovedMember(args: { email: string; orderId: string }): Promise<void> {
  const { email, orderId } = args;

  // Look up an existing auth user by email. listUsers is paginated;
  // we use the perPage:1 trick after a `filter` on email — but
  // supabase-js doesn't expose email filtering on listUsers, so the
  // pragmatic path is to attempt createUser and let it 422 if the
  // user already exists, then look them up.
  let userId: string | null = null;

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { provisioned_by: "shopify-orders-paid", shopify_order_id: orderId },
  });

  if (created.data?.user?.id) {
    userId = created.data.user.id;
  } else if (created.error) {
    // Supabase returns 422 with code 'email_exists' / 'user_already_exists'
    // when the email is already on the auth.users table. Fall back to
    // resolving the existing id by paging through users — small enough
    // user base that this is fine for now.
    const existing = await findUserIdByEmail(email);
    if (!existing) {
      throw new Error(`createUser failed: ${created.error.message}`);
    }
    userId = existing;
  }

  if (!userId) {
    throw new Error("Could not resolve user_id for provisioning");
  }

  // Grant the approved role. UPSERT-style: ON CONFLICT DO NOTHING via
  // the unique constraint, so retries are safe. We use untyped client
  // here because user_roles isn't in the generated Database types yet.
  const { error: insertErr } = await (
    supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string; ignoreDuplicates: boolean },
        ) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("user_roles")
    .upsert(
      { user_id: userId, role: "approved" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

  if (insertErr) {
    throw new Error(`user_roles upsert failed: ${insertErr.message}`);
  }

  // Email a magic link so they don't have to remember a password they
  // never set. If this fails we still consider provisioning a success —
  // the account + role exist, they can also use the standard password-
  // reset flow to set a password.
  try {
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  } catch (err) {
    console.warn("[shopify-webhook] magic-link send failed (non-fatal)", err);
  }
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  // listUsers returns the first 50 by default. For the early days this
  // is fine; once the user base outgrows that we should switch to a
  // dedicated lookup RPC. The page-walking version is a 5-min add when
  // needed.
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const target = email.toLowerCase();
  for (const u of data.users ?? []) {
    if ((u.email ?? "").toLowerCase() === target) return u.id;
  }
  return null;
}
