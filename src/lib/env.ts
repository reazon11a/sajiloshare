import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  CLEANUP_SECRET: z.string().min(8).optional(),
});

export function getEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    // Keep error terse to avoid leaking secrets in logs.
    throw new Error(
      `Missing/invalid environment variables. Check .env.example. Invalid: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`,
    );
  }
  return parsed.data;
}
