"use client";

import { useMemo, useState } from "react";

type ExpiresPreset = { label: string; seconds: number };

const PRESETS: ExpiresPreset[] = [
  { label: "15 min", seconds: 60 * 15 },
  { label: "30 min", seconds: 60 * 30 },
  { label: "24 hour", seconds: 60 * 60 * 24 },
];

export default function Home() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState(PRESETS[0]!.seconds);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<number | null>(null);

  const shareUrl = useMemo(() => {
    if (!code) return null;
    // Use relative URL so it works on any deployment domain
    return `${window.location.origin}/s/${code}`;
  }, [code]);

  async function copyToClipboard(textToCopy: string) {
    // 1) Modern clipboard API
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
    } catch {
      // ignore and fallback
    }

    // 2) Fallback for insecure contexts / older browsers
    try {
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCode(null);

    if (!text.trim() && !file) {
      setError("Paste text or choose a file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("expiresInSeconds", String(expiresInSeconds));
      if (text.trim()) fd.set("text", text);
      if (file) fd.set("file", file);

      const res = await fetch("/api/shares", { method: "POST", body: fd });
      const data = (await res.json()) as { code?: number; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      if (!data.code) throw new Error("No code returned");
      setCode(data.code);

      setText("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Sajilo Share</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Share text or a file with a public link. Links expire automatically.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_40px_rgba(34,197,94,0.10)]">
          <div>
            <label className="block text-sm font-medium">Text (optional)</label>
            <textarea
              className="mt-2 w-full rounded-md border border-zinc-800 bg-black p-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              rows={6}
              placeholder="Paste something to share…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">File (optional)</label>
            <input
              className="mt-2 block w-full text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100 hover:file:bg-zinc-700"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="mt-1 text-xs text-zinc-400">Selected: {file.name}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium">Expires in</label>
            <select
              className="mt-2 rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              value={expiresInSeconds}
              onChange={(e) => setExpiresInSeconds(Number(e.target.value))}
            >
              {PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 hover:bg-emerald-300"
          >
            {isSubmitting ? "Creating…" : "Create share link"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {shareUrl ? (
            <div className="rounded-md border border-zinc-800 bg-black p-3">
              <p className="text-sm font-medium">Your link</p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-2">
                  <a className="break-all text-sm underline" href={shareUrl}>
                    {shareUrl}
                  </a>
                  <input
                    className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
                <button
                  type="button"
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  onClick={async () => {
                    if (!shareUrl) return;
                    const ok = await copyToClipboard(shareUrl);
                    if (!ok) {
                      setError("Copy failed. Please copy manually from the textbox.");
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
        </form>

        <p className="mt-6 text-xs text-zinc-400">
          Help the developer of this project <span className="font-large">By Donating</span> on esewa.
          9814981693
        </p>
      </div>
    </div>
  );
}
