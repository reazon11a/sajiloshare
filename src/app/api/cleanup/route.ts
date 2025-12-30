import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CLEANUP_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1) Fetch expired shares
  const { data: expired, error: fetchErr } = await supabase
    .from("shares")
    .select("id,file_path")
    .lte("expires_at", nowIso);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const filePaths = (expired ?? [])
    .map((r) => r.file_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  // 2) Delete files from storage (best effort)
  let removedFiles = 0;
  if (filePaths.length > 0) {
    const removeRes = await supabase.storage.from("shares").remove(filePaths);
    if (!removeRes.error) {
      removedFiles = filePaths.length;
    }
  }

  // 3) Delete rows
  const { error: delErr, count } = await supabase
    .from("shares")
    .delete({ count: "exact" })
    .lte("expires_at", nowIso);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ deletedRows: count ?? 0, removedFiles });
}
