import { useEffect, useState } from 'react';

export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

/**
 * Server-synchronised countdown to an ISO instant.
 *
 * remaining = (target - serverTime) - (Date.now() - fetchedAt)
 *
 * The browser clock is never trusted: only the server-measured duration
 * minus locally-elapsed time since the status was fetched. Recalibrates
 * whenever the server payload changes. UI-only — the backend re-validates
 * the window at bid-commit time regardless of what this shows.
 */
export function useServerCountdown(
  targetIso: string | null | undefined,
  serverIso: string | null | undefined,
): number | null {
  const [now, setNow] = useState(() => Date.now());
  const [anchor, setAnchor] = useState(() => ({ targetIso, serverIso, at: Date.now() }));

  useEffect(() => {
    setAnchor({ targetIso, serverIso, at: Date.now() });
  }, [targetIso, serverIso]);

  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso || !anchor.serverIso) return null;
  const target = new Date(targetIso).getTime();
  const server = new Date(anchor.serverIso).getTime();
  if (!Number.isFinite(target) || !Number.isFinite(server)) return null;
  return target - server - (now - anchor.at);
}
