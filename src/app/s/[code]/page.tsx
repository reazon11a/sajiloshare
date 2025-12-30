import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ShareRow } from "@/lib/shares";
import { isExpired } from "@/lib/shares";

type Props = {
  params: Promise<{ code: string }>;
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto max-w-2xl p-6">{children}</div>
    </div>
  );
}

export default async function SharePage({ params }: Props) {
  const { code } = await params;
  const shortCode = Number(code);
  if (!Number.isInteger(shortCode) || shortCode < 1 || shortCode > 100) {
    notFound();
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .eq("short_code", shortCode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ShareRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  if (data.consumed_at) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold">This link was already used</h1>
        <p className="mt-2 text-zinc-300">
          The owner set this share as one-time view.
        </p>
      </PageShell>
    );
  }

  if (isExpired(data.expires_at)) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold">This link has expired</h1>
        <p className="mt-2 text-zinc-300">Ask the sender to create a new one.</p>
      </PageShell>
    );
  }

  if (data.kind === "text") {
    return (
      <PageShell>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Shared text</h1>
          <Link className="text-sm underline" href="/">
            Create another
          </Link>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-zinc-800 bg-black p-4 text-sm text-zinc-50">
          {data.text_content}
        </pre>
      </PageShell>
    );
  }

  if (!data.file_path) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold">Missing file</h1>
      </PageShell>
    );
  }

  const signed = await supabase.storage
    .from("shares")
    .createSignedUrl(data.file_path, 60, { download: data.file_name ?? undefined });

  if (signed.error) {
    throw new Error(signed.error.message);
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Shared file</h1>
        <Link className="text-sm underline" href="/">
          Create another
        </Link>
      </div>

      <p className="mt-4 text-sm text-zinc-300">
        File: <span className="font-medium text-zinc-50">{data.file_name}</span>
      </p>

      <a
        className="mt-4 inline-flex rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
        href={signed.data.signedUrl}
      >
        Download
      </a>

      <p className="mt-3 text-xs text-zinc-400">
        Note: the download URL is short-lived (60s). Refresh this page if it expires.
      </p>
    </PageShell>
  );
}
