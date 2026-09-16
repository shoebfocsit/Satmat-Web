// Global live-sync contract: every live surface re-checks the backend every
// 5s while its tab is visible and updates the moment new data lands.
//
// Cost control: the 5s tick only fetches LIGHTWEIGHT signals (/markets,
// /results, /lucky-number — a few KB). Heavy payloads (date-range /charts)
// are NEVER polled blindly — screens refetch their range only when the
// signal proves their selected market actually changed (see signature
// comparison in ChartsView / ChartHistoryView).

/** Poll cadence for all live surfaces (cards, results, charts signal). */
export const LIVE_POLL_MS = 5000;

export function isTabVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

interface ResultLike {
  date?: string | null;
  jodi?: string | null;
  panel?: string | null;
  open?: string | null;
  close?: string | null;
}

/** Stable fingerprint of one market's latest declared result. */
export function resultSignature(r: ResultLike | null | undefined): string {
  if (!r) return '';
  return [r.date ?? '', r.jodi ?? '', r.panel ?? '', r.open ?? '', r.close ?? ''].join('|');
}
