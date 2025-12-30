import { NextResponse } from "next/server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeExpiresAt } from "@/lib/shares";

const MAX_TEXT_CHARS = 100_000;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

const expiresInSchema = z.coerce
  .number()
  .int()
  .refine((v) => [60 * 15, 60 * 30, 60 * 60 * 24].includes(v), {
    message: "expiresInSeconds must be one of: 900, 1800, 86400",
  })
  .default(60 * 15);

function sanitizeFileName(name: string) {
  return name.replace(/[\\/]/g, "_").slice(0, 200);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const form = await req.formData();

  const text = (form.get("text") as string | null) ?? "";
  const file = form.get("file");
  const expiresInSeconds = expiresInSchema.parse(form.get("expiresInSeconds") ?? undefined);

  const hasText = text.trim().length > 0;
  const hasFile = file instanceof File && file.size > 0;

  if (!hasText && !hasFile) {
    return NextResponse.json(
      { error: "Provide either text or a file." },
      { status: 400 },
    );
  }

  if (hasText && text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `Text too large (max ${MAX_TEXT_CHARS} chars).` },
      { status: 400 },
    );
  }

  if (hasFile && (file as File).size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES} bytes).` },
      { status: 400 },
    );
  }

  const token = crypto.randomUUID();
  const expires_at = computeExpiresAt(expiresInSeconds);

  const supabase = createAdminClient();

  const nowIso = new Date().toISOString();
  const { data: usedCodes, error: usedErr } = await supabase
    .from("shares")
    .select("short_code")
    .gt("expires_at", nowIso)
    .is("consumed_at", null);

  if (usedErr) {
    return NextResponse.json({ error: usedErr.message }, { status: 500 });
  }

  const usedSet = new Set<number>((usedCodes ?? []).map((r) => Number(r.short_code)));
  let short_code: number | null = null;
  for (let i = 1; i <= 100; i++) {
    if (!usedSet.has(i)) {
      short_code = i;
      break;
    }
  }

  if (!short_code) {
    return NextResponse.json(
      { error: "All short codes (1–100) are currently in use. Try again after some expire." },
      { status: 429 },
    );
  }

  if (hasFile) {
    const f = file as File;
    const fileName = sanitizeFileName(f.name || "file");
    const path = `${token}/${fileName}`;

    const uploadRes = await supabase.storage
      .from("shares")
      .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });

    if (uploadRes.error) {
      return NextResponse.json(
        { error: uploadRes.error.message },
        { status: 500 },
      );
    }

    const insertRes = await supabase
      .from("shares")
      .insert({
        short_code,
        token,
        kind: "file",
        file_path: path,
        file_name: fileName,
        content_type: f.type || "application/octet-stream",
        expires_at,
      })
      .select("short_code")
      .single();

    if (insertRes.error) {
      // best-effort cleanup
      await supabase.storage.from("shares").remove([path]);
      return NextResponse.json(
        { error: insertRes.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ code: insertRes.data.short_code });
  }

  const insertRes = await supabase
    .from("shares")
    .insert({
      short_code,
      token,
      kind: "text",
      text_content: text,
      expires_at,
    })
    .select("short_code")
    .single();

  if (insertRes.error) {
    return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ code: insertRes.data.short_code });
}
