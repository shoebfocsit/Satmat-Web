import { NextResponse } from 'next/server';

// Vercel Cron + manual keep-alive endpoint.
// Pings the backend /health to keep the Render free-tier instance from sleeping
// (sleeps after 15min idle, cold start 10-20s). Vercel will call this every 5min
// via the cron in vercel.json, and the frontend also calls it on mount as backup.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const backend = process.env.API_BASE_URL || 'https://api.satmat.cloud';
  const base = backend.replace(/\/$/, '');
  const url = `${base}/health`;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      const ms = Date.now() - start;
      const text = await res.text().catch(() => '');
      return NextResponse.json({ ok: res.ok, status: res.status, ms, url, body: text.slice(0, 500) });
    } finally {
      clearTimeout(timer);
    }
  } catch (e: any) {
    const ms = Date.now() - start;
    return NextResponse.json({ ok: false, error: e?.message || String(e), ms, url }, { status: 503 });
  }
}
