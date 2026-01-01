
// supabase/functions/cleanup/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Allow only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const CLEANUP_SECRET = Deno.env.get("CLEANUP_SECRET"); // set this in function env

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  if (!CLEANUP_SECRET) {
    return new Response(
      JSON.stringify({ error: "Missing CLEANUP_SECRET in function env" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // Simple protection
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CLEANUP_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const nowIso = new Date().toISOString();

  // 1) Fetch expired shares (we need file_path so we can delete from Storage)
  const { data: expired, error: fetchErr } = await supabase
    .from("shares")
    .select("id, file_path")
    .lte("expires_at", nowIso);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const filePaths = (expired ?? [])
    .map((r) => r.file_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  // 2) Delete files from storage (best effort)
  let removedFiles = 0;
  if (filePaths.length > 0) {
    const removeRes = await supabase.storage.from("shares").remove(filePaths);
    if (!removeRes.error) removedFiles = filePaths.length;
  }

  // 3) Delete expired rows
  const { error: delErr, count } = await supabase
    .from("shares")
    .delete({ count: "exact" })
    .lte("expires_at", nowIso);

  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      deletedRows: count ?? 0,
      removedFiles,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});