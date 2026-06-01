import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Legacy shared-code gate. The previous version had `SourceSA2026`
// hardcoded as a fallback when ACCESS_CODE wasn't set — that fallback
// shipped in the public source the moment the repo went public, which
// would have let anyone sign in as any email.
//
// Removed: ACCESS_CODE is now MANDATORY, no string-literal fallback. If
// the env var isn't present the function refuses to authenticate and
// logs loudly — better than silently accepting a known-public secret.
//
// This whole gate is scheduled for replacement by real Supabase Auth +
// Shopify webhook-driven account provisioning in the next phase.

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().min(1).max(100),
});

export const verifyAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ACCESS_CODE;
    if (!expected) {
      console.error(
        "[auth] ACCESS_CODE env var is not set — refusing to authenticate. " +
          "Set ACCESS_CODE in your environment (Cloudflare/Vercel/local .env).",
      );
      return { ok: false as const, reason: "server_misconfigured" as const };
    }
    if (data.code !== expected) {
      return { ok: false as const, reason: "code" as const };
    }
    return { ok: true as const, email: data.email };
  });
