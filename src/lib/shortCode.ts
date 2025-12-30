import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Picks the first available short code between 1..100 that is NOT currently active.
 *
 * "Active" means: expires_at > now AND consumed_at IS NULL.
 *
 * Note: This is not perfectly race-condition free if many users create shares at the same time.
 */
export async function pickAvailableShortCode() {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("shares")
    .select("short_code")
    .gt("expires_at", nowIso)
    .is("consumed_at", null);

  if (error) throw new Error(error.message);

  const used = new Set<number>((data ?? []).map((r) => Number(r.short_code)));
  for (let i = 1; i <= 100; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}
