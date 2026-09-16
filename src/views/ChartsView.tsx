'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { BarChart3, CalendarDays, WifiOff, AlertTriangle } from 'lucide-react';
import type { ChartRangeResponse, Market } from '../types';
import { fetchChartRange, fetchResults } from '../lib/api';
import { LIVE_POLL_MS, isTabVisible, resultSignature } from '../lib/live';
import { LineChart } from '../components/LineChart';
import { LiveResultBox, PanelChartTable, JodiChartGrid, buildWeeks } from '../components/DpBossChart';

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  // Chart always opens on the present day (start = end = today).
  const today = toIso(new Date());
  return { start: today, end: today };
}

/** Full provider history starts in 2019 — "All" pulls everything in one request. */
const HISTORY_START = '2019-01-01';

const RANGE_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'Today', days: 1 },
  { label: '1M', days: 30 },
  { label: '3M', days: 91 },
  { label: '6M', days: 182 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

export const ChartsView: React.FC<{ focus?: 'jodi' | 'panel' | null }> = ({ focus = null }) => {
  const initial = useMemo(defaultRange, []);
  const [marketId, setMarketId] = useState<string>('kalyan');
  const [tab, setTab] = useState<'jodi' | 'panel'>(focus === 'jodi' ? 'jodi' : 'panel');
  const [startDate, setStartDate] = useState<string>(initial.start);
  const [endDate, setEndDate] = useState<string>(initial.end);
  const [preset, setPreset] = useState<string>('Today');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChartRangeResponse | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  // Load the live list of result markets from the backend (no local fallback).
  useEffect(() => {
    let cancelled = false;
    const loadMarkets = async () => {
      try {
        const { data } = await fetchResults();
        if (cancelled) return;
        const mapped: Market[] = (data.markets ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          result: m.result?.panel ?? '',
          openTime: m.openTime,
          closeTime: m.closeTime,
          isLive: false,
          isClosed: false,
          jodi: m.result?.jodi,
          panel: m.result?.panel,
          highlight: m.highlight,
        }));
        setMarkets(mapped);
        setMarketId((current) => {
          if (mapped.some((m) => m.id === current)) return current;
          return mapped.find((m) => m.highlight)?.id ?? mapped[0]?.id ?? current;
        });
      } catch {
        if (cancelled) return;
        setMarkets([]);
      } finally {
        if (!cancelled) setMarketsLoading(false);
      }
    };
    void loadMarkets();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMarket = markets.find((m) => m.id === marketId) ?? markets[0] ?? null;

  // Keep tab in sync when opened via a Jodi/Panel pill elsewhere.
  useEffect(() => {
    if (focus === 'jodi' || focus === 'panel') setTab(focus);
  }, [focus]);

  // DPBoss-style Mon–Sun weeks for the tables.
  const dpbWeeks = useMemo(
    () => (result ? buildWeeks(result.data, result.startDate, result.endDate) : []),
    [result],
  );

  // Live strip result: latest row of the range (full or partial).
  const liveResult = useMemo(() => {
    if (!result || result.data.length === 0) return null;
    const last = [...result.data].sort((a, b) => a.date.localeCompare(b.date)).pop()!;
    const open = last.open?.trim() || null;
    const jodi = last.jodi?.trim() || null;
    const close = last.close?.trim() || null;
    if (open && jodi && close) return `${open}-${jodi}-${close}`;
    if (open) return `${open}-**-***`;
    return null;
  }, [result]);

  const load = useCallback(async (force = false) => {
    setError(null);
    if (!startDate || !endDate) {
      setError('Please choose both a start and an end date.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    try {
      const { data, offline: isOffline } = await fetchChartRange(
        {
          market: marketId,
          startDate,
          endDate,
        },
        force,
      );
      setResult(data);
      setOffline(isOffline);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[ChartsView] load failed:', e);
      setError(e?.message || 'Failed to load chart. Please try again.');
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [marketId, startDate, endDate]);

  // Auto-load chart when market or date range changes — ensures chart always matches selected range
  useEffect(() => {
    void load(false);
  }, [load]);

  // Header refresh button + Load Chart tap force a fresh fetch.
  useEffect(() => {
    const h = () => void load(true);
    window.addEventListener('satmat:refresh', h);
    return () => window.removeEventListener('satmat:refresh', h);
  }, [load]);

  // Live sync: watch the lightweight /results signal every LIVE_POLL_MS and
  // silently refetch this range only when the selected market's latest
  // declare actually changed (and the viewed range covers that date). The
  // heavy /charts payload itself never polls blindly.
  useEffect(() => {
    const id = setInterval(() => {
      if (!isTabVisible() || !marketId) return;
      fetchResults().then(({ data }) => {
        const m = data.markets?.find((x) => x.id === marketId);
        const latest = m?.result ?? null;
        if (!latest?.date || latest.date < startDate || latest.date > endDate) return;
        const rows = result?.data ?? [];
        const last = rows.length
          ? [...rows].sort((a, b) => a.date.localeCompare(b.date)).pop()!
          : null;
        if (resultSignature(last) !== resultSignature(latest)) void load(false);
      }).catch(() => {});
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [marketId, startDate, endDate, result, load]);

  const applyPreset = (label: string, days: number | null) => {
    const end = new Date();
    const start = new Date();
    if (days === null) {
      setStartDate(HISTORY_START);
    } else {
      start.setDate(end.getDate() - (days - 1));
      setStartDate(toIso(start));
    }
    setEndDate(toIso(end));
    setPreset(label);
  };

  // Scroll highlight into view when focus changes from Jodi/Panel pill
  useEffect(() => {
    if (focus) {
      const el = document.getElementById(`chart-focus-${focus}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focus]);

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const chartSeries = useMemo(() => {
    if (!result) return [];
    const points = result.data
      .filter((r) => r.open !== null && r.close !== null)
      .map((r) => ({
        label: r.date.slice(8),
        open: Number(r.open),
        close: Number(r.close),
      }));
    return [
      { name: 'Open', color: '#F59E0B', points: points.map((p) => ({ label: p.label, value: p.open })) },
      { name: 'Close', color: '#2563EB', points: points.map((p) => ({ label: p.label, value: p.close })) },
    ];
  }, [result]);

  const renderMiniCalendar = (onPick: (d: Date) => void) => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: startWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    return (
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setPickerMonth(new Date(year, month - 1, 1))}
            className="text-gray-400 hover:text-gray-900 px-2"
          >
            ‹
          </button>
          <p className="text-xs font-bold text-gray-800">
            {pickerMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => setPickerMonth(new Date(year, month + 1, 1))}
            className="text-gray-400 hover:text-gray-900 px-2"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.map((day, i) =>
            day === null ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => onPick(new Date(year, month, day))}
                className="py-1.5 rounded-lg text-[11px] font-semibold text-gray-800 hover:bg-gray-100"
              >
                {day}
              </button>
            ),
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] p-4 flex items-center gap-3 shadow-xl mb-5">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#0EA5E9]/20 blur-2xl" />
          <span className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-[#0EA5E9]/20 shrink-0">
            <BarChart3 size={20} className="text-white" />
          </span>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Live Charts
              <span className="px-2 py-0.5 rounded-full bg-[#14B8A6] text-white text-[9px] font-black">PREMIUM</span>
            </h1>
            <p className="text-[11px] font-medium text-white/70">
              14 markets • {result ? `${result.count} results` : 'Select date range'} • IST live
            </p>
          </div>
        </div>

        {/* Market selector */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Select Market
          </p>
          {marketsLoading ? (
            <p className="text-xs text-gray-400 font-medium">Loading markets…</p>
          ) : markets.length === 0 ? (
            <p className="text-xs text-gray-500 font-medium">
              No markets available. Results will appear here once declared.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {markets.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMarketId(m.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition active:scale-[0.97] border ${
                    m.id === marketId
                      ? m.highlight
                        ? 'bg-gradient-to-r from-[#0EA5E9] to-[#14B8A6] text-white shadow-md shadow-[#0EA5E9]/20 border-transparent'
                        : 'bg-[#0F172A] text-white shadow-md border-[#0F172A]'
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#0EA5E9]/30 hover:text-[#0F172A]'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          {/* Range presets — auto-loads on change */}
          <div className="flex flex-wrap gap-2 mb-3">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.label, p.days)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wide transition active:scale-[0.97] border ${
                  preset === p.label
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#0EA5E9]/40 hover:text-[#0F172A]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowStartPicker((v) => !v);
                    setShowEndPicker(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-gray-200 hover:border-gray-300 transition"
                >
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Start Date</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(startDate)}</p>
                </button>
                {showStartPicker && (
                  <div className="absolute left-0 top-full mt-2 z-30 w-72">
                    {renderMiniCalendar((d) => {
                      setStartDate(toIso(d));
                      setPreset('');
                      setShowStartPicker(false);
                    })}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEndPicker((v) => !v);
                    setShowStartPicker(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-gray-200 hover:border-gray-300 transition"
                >
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">End Date</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(endDate)}</p>
                </button>
                {showEndPicker && (
                  <div className="absolute left-0 top-full mt-2 z-30 w-72">
                    {renderMiniCalendar((d) => {
                      setEndDate(toIso(d));
                      setPreset('');
                      setShowEndPicker(false);
                    })}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => void load(true)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-black hover:bg-[#1D4ED8] transition disabled:opacity-60 active:scale-[0.98] shadow-md shadow-[#2563EB]/20"
            >
              {loading ? 'Loading…' : 'Load Chart'}
            </button>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
        {focus && result && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold ${focus === 'jodi' ? 'bg-[#FFF0F0] border-[#EF4444]/30 text-[#EF4444]' : 'bg-[#E0F2FE] border-[#0EA5E9]/40 text-[#0C4A6E]'}`}>
            <span className={`w-2 h-2 rounded-full ${focus === 'jodi' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#0EA5E9] animate-pulse'}`} />
            <span id={`chart-focus-${focus}`}>{focus === 'jodi' ? 'Jodi Live Chart' : 'Panel Live Chart'} — {selectedMarket?.name ?? result.market}</span>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-black/5">LIVE</span>
          </div>
        )}
        {offline && result && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <WifiOff size={14} />
            Backend offline — showing the last synced chart (may be stale).
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-5 space-y-5">
            {/* Chart Summary — Total Results */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#0EA5E9]" />
                  Chart Summary
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0EA5E9] text-[#0F172A] border border-[#14B8A6]">
                    Total Results: {result.count}
                  </span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                <div className="bg-[#F9FAFB] rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Results</p>
                  <p className="text-2xl font-black text-[#0F172A] mt-1">{result.count}</p>
                  <p className="text-[10px] text-gray-500 font-medium">declared</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date Range</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">
                    {Math.round((Date.parse(result.endDate) - Date.parse(result.startDate)) / 86400000) + 1}d
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium truncate">
                    {formatDate(result.startDate)} – {formatDate(result.endDate)}
                  </p>
                </div>
                <div className="bg-[#F9FAFB] rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Market</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1 truncate">{selectedMarket?.name ?? result.market}</p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {result.missingDates.length === 0 ? 'complete' : `${result.missingDates.length} missing`}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-3 flex items-center justify-between text-[10px] font-medium text-gray-400">
                <span>Source: {result.source}</span>
                <span>Showing chart for {formatDate(result.startDate)} → {formatDate(result.endDate)}</span>
              </div>
            </div>

            {/* Line chart */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={14} className="text-gray-400" />
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Open vs Close trend
                </h3>
              </div>
              <LineChart series={chartSeries} height={200} />
            </div>

            {/* Missing dates */}
            {result.missingDates.length > 0 && (
              <div className="bg-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500 font-medium">
                {result.missingDates.length} date(s) in this range have no declared result
                (e.g. {result.missingDates.slice(0, 3).join(', ')}
                {result.missingDates.length > 3 ? ', …' : ''}). Missing dates are shown
                honestly — no data is fabricated.
              </div>
            )}

            {/* Live strip + Jodi/Panel toggle + DPBoss tables */}
            <LiveResultBox
              name={selectedMarket?.name ?? result.market}
              result={liveResult}
              refreshing={loading}
              onRefresh={() => void load(true)}
            />
            <div id={focus ? `chart-focus-${focus}` : undefined} className="bg-[#0F172A] rounded-2xl p-1.5 grid grid-cols-2 gap-1.5">
              {(['jodi', 'panel'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition active:scale-[0.98] ${
                    tab === t ? 'bg-white text-[#0F172A] shadow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t === 'jodi' ? 'Jodi Chart' : 'Panel Chart'}
                </button>
              ))}
            </div>
            {tab === 'jodi' ? (
              <JodiChartGrid weeks={dpbWeeks} />
            ) : (
              <PanelChartTable weeks={dpbWeeks} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};