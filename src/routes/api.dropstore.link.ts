import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * POST /api/dropstore/link
 *
 * Links the signed-in ZA Supplier Hub member to their DropStore account so
 * order history can be tied to their DropStore identity.
 *
 * Why not call DropStore's /api/auth/login to verify?
 *   DropStore login enforces a 3-device cap with fingerprinting, a server
 *   verification call would consume a device slot and can LOCK the member
 *   out of DropStore. So we never touch the login flow.
 *
 * Two modes:
 *   1. Soft link (default): stores the member's claimed DropStore email on
 *      their profile. Safe, no external calls. The email is the join key
 *      (orders + dropstore_accounts are both email-keyed).
 *   2. Verified link (optional): if DROPSTORE_SUPABASE_URL and
 *      DROPSTORE_SUPABASE_SERVICE_KEY are set (the AOS/DropStore Supabase
 *      project), we do a READ-ONLY lookup of dropstore_accounts by email to
 *      confirm the account exists and pull its id + tier. Never writes to
 *      DropStore, never touches device/login flows.
 *
 * Auth: the caller must send their Supabase access token as
 * `Authorization: Bearer <token>`. The profile is updated with that same
 * user-scoped client, so RLS ("Update own profile") is enforced, no
 * service-role key for this app's own DB is required.
 */
export const Route = createFileRoute("/api/dropstore/link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          console.error("[dropstore-link] Supabase env not configured");
          return json({ ok: false, error: "Server not configured" }, 500);
        }

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return json({ ok: false, error: "Not authenticated" }, 401);
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) return json({ ok: false, error: "Not authenticated" }, 401);

        let body: { dropstore_email?: string };
        try {
          body = (await request.json()) as { dropstore_email?: string };
        } catch {
          return json({ ok: false, error: "Invalid request body" }, 400);
        }

        const dropstoreEmail = (body.dropstore_email ?? "").trim().toLowerCase();
        if (!dropstoreEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dropstoreEmail)) {
          return json({ ok: false, error: "Enter a valid DropStore email." }, 400);
        }

        // User-scoped client, RLS applies. Used to verify the caller and to
        // update *their own* profile.
        const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
        const userId = claimsData?.claims?.sub as string | undefined;
        if (claimsErr || !userId) {
          return json({ ok: false, error: "Session expired, sign in again." }, 401);
        }

        // Optional read-only verification against the DropStore DB.
        let verified = false;
        let tier: string | null = null;
        let dropstoreAccountId: string | null = null;

        const dsUrl = process.env.DROPSTORE_SUPABASE_URL;
        const dsKey = process.env.DROPSTORE_SUPABASE_SERVICE_KEY;
        if (dsUrl && dsKey) {
          try {
            const dsClient = createClient(dsUrl, dsKey, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data: account, error: lookupErr } = await dsClient
              .from("dropstore_accounts")
              .select("id, package_tier")
              .ilike("email", dropstoreEmail)
              .maybeSingle();
            if (lookupErr) {
              console.error("[dropstore-link] lookup failed", lookupErr.message);
            } else if (!account) {
              return json(
                { ok: false, error: "No DropStore account found for that email." },
                404,
              );
            } else {
              verified = true;
              dropstoreAccountId = (account as { id?: string }).id ?? null;
              tier = (account as { package_tier?: string }).package_tier ?? null;
            }
          } catch (err) {
            // Verification is best-effort, fall back to a soft link rather
            // than blocking the member if the DropStore DB is unreachable.
            console.error("[dropstore-link] verification error (soft-linking)", err);
          }
        }

        const { error: updateErr } = await userClient
          .from("profiles")
          .update({
            dropstore_email: dropstoreEmail,
            dropstore_account_id: dropstoreAccountId,
            dropstore_tier: tier,
            dropstore_linked_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateErr) {
          console.error("[dropstore-link] profile update failed", updateErr.message);
          return json({ ok: false, error: "Could not save the link. Try again." }, 500);
        }

        return json({ ok: true, verified, tier }, 200);
      },
    },
  },
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
