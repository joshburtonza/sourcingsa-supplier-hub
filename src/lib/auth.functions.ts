import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SHARED_CODE = "SourceSA2026";

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().min(1).max(100),
});

export const verifyAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ACCESS_CODE ?? SHARED_CODE;
    if (data.code !== expected) {
      return { ok: false as const, reason: "code" as const };
    }
    // Shopify order verification is intentionally disabled — gating by shared code only.
    return { ok: true as const, email: data.email };
  });
