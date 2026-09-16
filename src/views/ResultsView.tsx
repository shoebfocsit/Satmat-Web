'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trophy, WifiOff } from 'lucide-react';
import type { ResultsResponse } from '../types';
import { fetchResults } from '../lib/api';
import { LIVE_POLL_MS, isTabVisible } from '../lib/live';
import { ResultCard } from '../components/ResultCard';

export const ResultsView: React.FC<{ onOpenChart?: (marketId: string, focus: 'jodi' | 'panel') => void }> = ({ onOpenChart }) => {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (asRefresh: boolean) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setFailed(false);
    try {
      // Manual/header refresh forces a network fetch; initial + poll use cache.
      const { data: res, offline: isOffline } = await fetchResults(asRefresh);
      setData(res);
      setOffline(isOffline);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ResultsView] load failed:', e);
      setOffline(true);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Header refresh button also force-reloads this screen.
  useEffect(() => {
    const h = () => void load(true);
    window.addEventListener('satmat:refresh', h);
    return () => window.removeEventListener('satmat:refresh', h);
  }, [load]);

  // Continuous live refresh: silent re-fetch every LIVE_POLL_MS while the tab
  // is visible (no spinner flash). Paused when hidden. Manual Refresh forces.
  useEffect(() => {
    const id = setInterval(() => {
      if (!isTabVisible()) return;
      fetchResults().then(({ data: res, offline: isOffline }) => {
        setData(res);
        setOffline(isOffline);
      }).catch(() => {});
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const markets = data?.markets ?? [];

  const formatUpdatedAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Premium Header */}
      <div className="px-4 md:px-8 pt-6">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] p-4 flex items-center gap-3 shadow-xl">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#0EA5E9]/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-[#14B8A6]/15 blur-2xl" />
          <span className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-[#0EA5E9]/20 shrink-0">
            <Trophy size={20} className="text-white fill-white/20" />
          </span>
          <div className="relative min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Live Results
              <span className="px-2 py-0.5 rounded-full bg-[#EF4444] text-white text-[9px] font-black animate-pulse">LIVE</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold border border-white/20">14 MARKETS</span>
            </h1>
            <p className="text-[11px] font-medium text-white/70 truncate">
              IST • Live every 5s • Tap Jodi/Panel for chart
            </p>
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {offline && (
        <div className="px-4 md:px-8 pt-4">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E0F2FE] border border-[#0EA5E9]/30 text-[#0C4A6E] text-[11px] font-semibold shadow-sm">
            <WifiOff size={14} className="shrink-0 text-[#0EA5E9]" />
            <span>
              {failed
                ? 'Results could not be loaded. Tap Refresh to retry.'
                : 'Connection slow — retrying live data…'}
            </span>
          </div>
        </div>
      )}

      {/* Panels — full-width flat panels, edge-to-edge like Flutter */}
      <div className="pt-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-[118px] w-full bg-[#E5E7EB]" />
          ))
        ) : markets.length === 0 && !failed ? (
          <div className="text-center py-14 bg-white border border-[#D1D5DB] rounded-2xl shadow-sm">
            <Trophy size={36} className="mx-auto text-[#D1D5DB]" />
            <p className="mt-4 text-sm font-bold text-[#0F172A]">No results yet</p>
            <p className="mt-1 text-xs text-[#6B7280]">Results will appear here once declared.</p>
          </div>
        ) : (
          markets.map((m, i) => (
            <React.Fragment key={m.id}>
              <ResultCard market={m} onOpenChart={onOpenChart} />
              {i < markets.length - 1 && (
                <div className="h-px w-full bg-[#E5E7EB]" />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Footer */}
      {data && !failed && (
        <p className="pt-4 px-4 md:px-8 text-center text-[11px] font-medium text-[#9CA3AF]">
          Last updated:{' '}
          <span className="text-[#737373]">{formatUpdatedAt(data.updatedAt)}</span>
          {offline && ' · retrying…'}
        </p>
      )}

      {/* Floating refresh button (bottom-right) */}
      <button
        onClick={() => void load(true)}
        disabled={refreshing}
        className="fixed bottom-6 right-4 md:right-8 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-lg shadow-[#2563EB]/20 hover:bg-[#1D4ED8] transition disabled:opacity-60 active:scale-[0.98] border border-white/20"
        aria-label="Refresh results"
      >
        {refreshing ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : (
          <RefreshCw size={15} />
        )}
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
};
