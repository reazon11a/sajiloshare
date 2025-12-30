# Supabase Share (Next.js)

A tiny web app to share **text** or a **file** via a public link, backed by Supabase.

- Create a share at `/`
- View/download via `/s/[code]` (1–100)
- Links expire based on `expires_at`

## 1) Supabase setup

### A) Create table + bucket

1. Create a Supabase project
2. In the SQL editor, run: `supabase_schema.sql`
3. In **Storage**, create a bucket named `shares` (private)

> This app reads/writes using the **service role key on the server**, so you don't need RLS policies for the MVP.

### B) Environment variables

Copy `.env.example` to `.env.local` and fill in values from Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

## 2) Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Automatic cleanup (delete after expiry)

Supabase does not automatically delete rows/files exactly at `expires_at` unless you run a scheduled job.

This project includes an endpoint:

- `POST /api/cleanup`
- Header: `Authorization: Bearer <CLEANUP_SECRET>`

It will:
1) delete expired files from the `shares` storage bucket (best-effort)
2) delete expired rows from `public.shares`

### How to schedule it

Option 1 (simple): use any external cron (GitHub Actions, UptimeRobot, cron-job.org) to call your deployed URL every minute.

Option 2: Supabase Scheduled Triggers (Cron)
- In Supabase Dashboard → **Scheduled Triggers**
- Create a trigger to run every 1 minute and call your API endpoint (HTTP request) with the auth header.

## Notes / limits

- Max text: 100,000 chars
- Max file: 20 MB
- Signed download URLs are generated for 60 seconds; refresh the share page if needed
