import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Market, WeekGroup, ChartRecord, ChartResultRecord } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { sanitizeText } from '../lib/validation';
import { fetchChartRange, fetchResults } from '../lib/api';
import { LIVE_POLL_MS, isTabVisible, resultSignature } from '../lib/live';
import { LiveResultBox, PanelChartTable, JodiChartGrid, buildWeeks } from '../components/DpBossChart';

interface ChartHistoryViewProps {
  markets: Market[];
  selectedMarket: Market | null;
  onSelectMarket: (market: Market) => void;
  onBack: () => void;
  focus?: 'jodi' | 'panel' | null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00`);

const formatDate = (d: Date): string =>
  `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

const formatChartDate = (iso: string): string => {
  const d = parseIso(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
};

/** Full provider history starts in 2019 — "All" pulls everything in one request. */
const HISTORY_START = new Date(2019, 0, 1);

const RANGE_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'Today', days: 1 },
  { label: '1M', days: 30 },
  { label: '3M', days: 91 },
  { label: '6M', days: 182 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

export const ChartHistoryView: React.FC<ChartHistoryViewProps> = ({
  markets,
  selectedMarket,
  onSelectMarket,
  onBack,
  focus = null,
}) => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Chart always opens on the present day (start = end = today).
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [startPickerMonth, setStartPickerMonth] = useState<Date>(thirtyDaysAgo);
  const [endPickerMonth, setEndPickerMonth] = useState<Date>(today);
  const [rangePickerMonth, setRangePickerMonth] = useState<Date>(today);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [weeks, setWeeks] = useState<WeekGroup[]>([]);
  const [raw, setRaw] = useState<ChartResultRecord[]>([]);
  const [pendingRangeStart, setPendingRangeStart] = useState<Date | null>(null);
  const [pendingRangeEnd, setPendingRangeEnd] = useState<Date | null>(null);
  const [preset, setPreset] = useState<string>('Today');

  const market = selectedMarket ?? markets[0] ?? null;

  const totalResults = weeks.reduce((sum, w) => sum + w.records.length, 0);

  /** Monday (ISO start of week) for a YYYY-MM-DD date. */
  const mondayOf = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return toIso(d);
  };

  // Reset chart when switching markets
  useEffect(() => {
    setLoaded(false);
    setWeeks([]);
    setRaw([]);
  }, [market?.id]);

  // DPBoss-style Mon–Sun weeks (gap-filled with ***/**) for the tables.
  const dpbWeeks = useMemo(
    () => (loaded ? buildWeeks(raw, toIso(startDate), toIso(endDate)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, raw, startDate.getTime(), endDate.getTime()],
  );

  const loadChartData = useCallback(
    async (from?: Date, to?: Date, force = false) => {
      if (!market) return;
      const fromIso = toIso(from ?? startDate);
      const toIsoStr = toIso(to ?? endDate);
      setLoading(true);
      setOffline(false);

      try {
        const res = await fetchChartRange(
          { market: market.id, startDate: fromIso, endDate: toIsoStr },
          force,
        );
        setOffline(res.offline);
        const sorted = [...res.data.data]
          .filter((r) => r.date >= fromIso && r.date <= toIsoStr)
          .sort((a, b) => a.date.localeCompare(b.date));
        // Raw rows (nulls preserved) feed the DPBoss-style week tables.
        setRaw(sorted);
        const records: ChartRecord[] = sorted
          .map((r) => ({
            date: r.date,
            open: r.open ?? '--',
            openAnk: (r.open ?? '--').slice(-1),
            jodi: r.jodi ?? '--',
            close: r.close ?? '--',
            closeAnk: (r.close ?? '--').slice(-1),
          }));

        const byWeek = new Map<string, ChartRecord[]>();
        for (const rec of records) {
          const key = mondayOf(rec.date);
          const group = byWeek.get(key) ?? [];
          group.push(rec);
          byWeek.set(key, group);
        }
        const grouped: WeekGroup[] = Array.from(byWeek.entries()).map(([monday, recs]) => ({
          label: `Week of ${formatChartDate(monday)}`,
          records: recs,
        }));

        setWeeks(grouped);
      } catch {
        setWeeks([]);
        setRaw([]);
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    },
    [market, startDate, endDate],
  );

  // Auto-load chart when market or date range changes — ensures Total Results + chart always reflect selected range
  useEffect(() => {
    void loadChartData();
  }, [loadChartData]);

  // Header refresh button force-reloads this screen's chart.
  useEffect(() => {
    const h = () => void loadChartData(undefined, undefined, true);
    window.addEventListener('satmat:refresh', h);
    return () => window.removeEventListener('satmat:refresh', h);
  }, [loadChartData]);

  // Live sync: watch the lightweight /results signal every LIVE_POLL_MS and
  // silently refetch this range only when this market's latest declare
  // actually changed inside the viewed range (same contract as ChartsView).
  useEffect(() => {
    const id = setInterval(() => {
      if (!isTabVisible() || !market) return;
      const fromIso = toIso(startDate);
      const toIsoStr = toIso(endDate);
      fetchResults().then(({ data }) => {
        const m = data.markets?.find((x) => x.id === market.id);
        const latest = m?.result ?? null;
        if (!latest?.date || latest.date < fromIso || latest.date > toIsoStr) return;
        const last = raw.length
          ? [...raw].sort((a, b) => a.date.localeCompare(b.date)).pop()!
          : null;
        if (resultSignature(last) !== resultSignature(latest)) void loadChartData();
      }).catch(() => {});
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [market, startDate, endDate, raw, loadChartData]);

  const applyPreset = (label: string, days: number | null) => {
    const end = new Date();
    const start = days === null ? new Date(HISTORY_START) : new Date(end);
    if (days !== null) start.setDate(end.getDate() - (days - 1));
    setStartDate(start);
    setEndDate(end);
    setPreset(label);
    // Auto-load fires via the range-change effect; force for immediacy.
    void loadChartData(start, end, true);
  };

  // Helper to build a mini calendar for the month of `viewMonth`.
  // - `highlight`: optional { start, end } range to highlight.
  // - `onPick`: called when a day is clicked.
  const renderCalendar = (
    viewMonth: Date,
    onNavigate: (d: Date) => void,
    highlight: { start?: Date; end?: Date },
    onPick: (d: Date) => void,
  ) => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: startWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const hStart = highlight.start
      ? new Date(highlight.start.getFullYear(), highlight.start.getMonth(), highlight.start.getDate()).getTime()
      : null;
    const hEnd = highlight.end
      ? new Date(highlight.end.getFullYear(), highlight.end.getMonth(), highlight.end.getDate()).getTime()
      : null;

    const cellStyle = (day: number): string => {
      const t = new Date(year, month, day).getTime();
      const isStart = hStart !== null && t === hStart;
      const isEnd = hEnd !== null && t === hEnd;
      const inRange =
        hStart !== null && hEnd !== null && t > hStart && t < hEnd;
      if (isStart || isEnd) {
        return 'bg-[#0EA5E9] text-[#363636] font-bold shadow-sm shadow-[#2563EB]/40';
      }
      if (inRange) {
        return 'bg-[#0EA5E9]/20 text-[#0F172A] font-medium';
      }
      if (t === todayTime) {
        return 'text-[#0F172A] font-bold border border-[#0EA5E9]/60 hover:bg-[#0EA5E9]/20';
      }
      return 'text-[#0F172A] hover:bg-[#F8FAFC]';
    };

    return (
      <div className="p-4 bg-white border border-[#D1D5DB] rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => onNavigate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-[#0F172A] hover:bg-[#F8FAFC] transition"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-bold text-[#0F172A]">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            onClick={() => onNavigate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-[#0F172A] hover:bg-[#F8FAFC] transition"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#9CA3AF] mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
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
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${cellStyle(day)}`}
              >
                {day}
              </button>
            ),
          )}
        </div>
      </div>
    );
  };

  if (!market) {
    return (
      <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-8 text-center shadow-sm">
          <CalendarDays size={32} className="mx-auto text-[#D1D5DB]" />
          <p className="mt-3 text-sm font-bold text-[#0F172A]">No market selected</p>
          <p className="mt-1 text-xs text-[#6B7280]">Markets are loading from the server. Please retry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setShowRangePicker((v) => !v);
              setShowStartPicker(false);
              setShowEndPicker(false);
              if (!showRangePicker) {
                setRangePickerMonth(endDate);
                setPendingRangeStart(null);
                setPendingRangeEnd(null);
              }
            }}
            className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5 rounded-lg hover:opacity-80 transition"
            aria-label="Open date range picker"
          >
            <CalendarDays size={16} className="text-[#0EA5E9]" />
            <span>Chart History</span>
          </button>

          {showRangePicker && (
            <div className="absolute left-0 top-full mt-2 z-30 w-72">
              {renderCalendar(
                rangePickerMonth,
                setRangePickerMonth,
                { start: pendingRangeStart ?? undefined, end: pendingRangeEnd ?? undefined },
                (d) => {
                  if (!pendingRangeStart || (pendingRangeStart && pendingRangeEnd)) {
                    setPendingRangeStart(d);
                    setPendingRangeEnd(null);
                  } else if (d >= pendingRangeStart) {
                    setPendingRangeEnd(d);
                  } else {
                    setPendingRangeStart(d);
                  }
                  setRangePickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                },
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setPendingRangeStart(null);
                    setPendingRangeEnd(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] text-[#0F172A] text-xs font-bold hover:bg-[#E5E7EB] transition"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (pendingRangeStart) {
                      const from = pendingRangeStart;
                      const to = pendingRangeEnd ?? pendingRangeStart;
                      setStartDate(from);
                      setEndDate(to);
                      setPreset('');
                      setShowRangePicker(false);
                      loadChartData(from, to, true);
                    }
                  }}
                  disabled={!pendingRangeStart || !pendingRangeEnd}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-md shadow-[#2563EB]/20 transition disabled:opacity-50"
                >
                  Apply Range
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[#6B7280] text-center">
                {pendingRangeStart && pendingRangeEnd
                  ? `${formatDate(pendingRangeStart)} – ${formatDate(pendingRangeEnd)}`
                  : pendingRangeStart
                    ? `Start: ${formatDate(pendingRangeStart)} — pick end date`
                    : 'Pick a start date'}
              </p>
            </div>
          )}
        </div>

        {/* Market switcher */}
        <select
          value={market.id}
          onChange={(e) => {
            const m = markets.find((mk) => mk.id === e.target.value);
            if (m) onSelectMarket(m);
          }}
          className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0EA5E9]"
          aria-label="Select market"
        >
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date range picker card */}
      <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-sm">
        {/* Range presets */}
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
            {/* Start date */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowStartPicker(!showStartPicker);
                  setShowEndPicker(false);
                  setShowRangePicker(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] hover:border-[#0EA5E9]/40 transition-colors"
              >
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase">Start Date</p>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5">{formatDate(startDate)}</p>
              </button>
              {showStartPicker && (
                <div className="absolute left-0 top-full mt-2 z-30 w-72">
                  {renderCalendar(
                    startPickerMonth,
                    setStartPickerMonth,
                    { start: startDate },
                    (d) => {
                      setStartDate(d);
                      setStartPickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      setShowStartPicker(false);
                    },
                  )}
                </div>
              )}
            </div>

            {/* End date */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowEndPicker(!showEndPicker);
                  setShowStartPicker(false);
                  setShowRangePicker(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] hover:border-[#0EA5E9]/40 transition-colors"
              >
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase">End Date</p>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5">{formatDate(endDate)}</p>
              </button>
              {showEndPicker && (
                <div className="absolute left-0 top-full mt-2 z-30 w-72">
                  {renderCalendar(
                    endPickerMonth,
                    setEndPickerMonth,
                    { start: endDate },
                    (d) => {
                      setEndDate(d);
                      setEndPickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      setShowEndPicker(false);
                    },
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => loadChartData(undefined, undefined, true)}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-md shadow-[#2563EB]/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? 'Loading...' : 'Load Chart Data'}</span>
          </button>
        </div>
      </div>

      {/* Chart Summary — Total Results (always reflects selected date range) */}
      {loaded && (
        <div className="bg-white border border-[#D1D5DB] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/60">
            <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <CalendarDays size={14} className="text-[#0EA5E9]" />
              Chart Summary
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0EA5E9] text-[#0F172A] border border-[#14B8A6]">
              Total Results: {totalResults}
            </span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Total Results</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{totalResults}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">declared</p>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Date Range</p>
              <p className="text-sm font-bold text-[#0F172A] mt-1">
                {Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1}d
              </p>
              <p className="text-[10px] text-[#6B7280] font-medium truncate">
                {formatDate(startDate)} – {formatDate(endDate)}
              </p>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Market</p>
              <p className="text-sm font-bold text-[#0F172A] mt-1 truncate">{market.name}</p>
              <p className="text-[10px] text-[#6B7280] font-medium">{weeks.length} week{weeks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="px-4 pb-3 flex items-center justify-between text-[10px] font-medium text-[#9CA3AF]">
            <span>Showing {totalResults} results for selected range</span>
            <span>{formatDate(startDate)} → {formatDate(endDate)}</span>
          </div>
        </div>
      )}

      {loaded && offline && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E0F2FE] border border-[#FBC02D] text-[#0C4A6E] text-[11px] font-semibold">
          <span>Backend offline — showing last synced results (may be stale).</span>
        </div>
      )}

      {/* Market info strip */}
      <div className="bg-[#E5E7EB] border border-[#D1D5DB] rounded-2xl p-3 flex items-center justify-between shadow-sm">
        <span className="text-xs font-bold text-[#0F172A] tracking-wide uppercase">
          {sanitizeText(market.name, 50)}
        </span>
        <span className="text-[11px] text-[#6B7280] font-semibold">
          Open - {market.openTime} · Close - {market.closeTime}
        </span>
      </div>

      {/* Focus indicator — shows which live chart was requested */}
      {focus && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold ${focus === 'jodi' ? 'bg-[#FFF0F0] border-[#EF4444]/30 text-[#EF4444]' : 'bg-[#E0F2FE] border-[#0EA5E9]/40 text-[#0C4A6E]'}`}>
          <span className={`w-2 h-2 rounded-full ${focus === 'jodi' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#0EA5E9] animate-pulse'}`} />
          <span>{focus === 'jodi' ? 'Jodi Live Chart' : 'Panel Live Chart'} — {sanitizeText(market.name, 30)}</span>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-black/5">LIVE</span>
        </div>
      )}

      {/* Live result strip + DPBoss-style chart (like a proper matka platform) */}
      {loaded && raw.length > 0 && (
        <div className="space-y-3">
          <LiveResultBox
            name={market.name}
            result={market.result}
            refreshing={loading}
            onRefresh={() => loadChartData(undefined, undefined, true)}
          />
          {focus === 'jodi' ? (
            <JodiChartGrid weeks={dpbWeeks} />
          ) : (
            <PanelChartTable weeks={dpbWeeks} />
          )}
        </div>
      )}
      {loaded && raw.length === 0 && (
        <div className="text-center py-14 bg-white border border-[#D1D5DB] rounded-2xl shadow-sm">
          <CalendarDays size={36} className="mx-auto text-[#D1D5DB]" />
          <p className="mt-4 text-sm font-bold text-[#0F172A]">No chart data in this range</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Try a wider date range or pick a different market.
          </p>
        </div>
      )}

      {/* Empty state before loading */}
      {!loaded && (
        <div className="text-center py-16 bg-white border border-[#D1D5DB] rounded-2xl shadow-sm">
          <CalendarDays size={36} className="mx-auto text-[#D1D5DB]" />
          <p className="mt-4 text-sm font-bold text-[#0F172A]">No chart data loaded</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Select a date range and click “Load Chart Data” to view results.
          </p>
        </div>
      )}
    </div>
  );
};