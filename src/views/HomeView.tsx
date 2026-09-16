import React from 'react';
import { Market, AppRoute, LuckyNumber } from '../types';
import {
  BarChart3,
  Play,
  Clock,
  Flame,
  ChevronRight,
  Sparkles,
  Radio,
} from 'lucide-react';
import { progressiveJodi } from '../components/DpBossChart';

function todayISTStr(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const d = parts.find((p) => p.type === 'day')!.value;
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function fmtDateShort(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

/** "Today • 08 Sep" (green) when result is from current IST date, else "08 Sep" (amber = old). */
const ResultDateBadge: React.FC<{ date?: string | null }> = ({ date }) => {
  if (!date) {
    return (
      <span className="ml-1 px-1.5 py-px rounded-full bg-[#F1F5F9] text-[#94A3B8] text-[8px] font-black tracking-widest border border-[#E2E8F0]">
        AWAITING
      </span>
    );
  }
  const isToday = date === todayISTStr();
  return (
    <span className={`ml-1 px-1.5 py-px rounded-full text-[8px] font-black tracking-widest border ${
      isToday
        ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25'
        : 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/25'
    }`}>
      {isToday ? `TODAY • ${fmtDateShort(date)}` : fmtDateShort(date)}
    </span>
  );
};

/** OPEN ✓ / CLOSE ✓ chips parsed from "open-jodi-close" (*** = pending). */
const OpenCloseChips: React.FC<{ result?: string | null }> = ({ result }) => {
  const parts = (result || '').split('-');
  const openOk = parts.length === 3 && /^\d{3}$/.test(parts[0]);
  const closeOk = parts.length === 3 && /^\d{3}$/.test(parts[2]);
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <span className={`px-1.5 py-px rounded-full text-[8px] font-black tracking-widest border flex items-center gap-1 ${
        openOk ? 'bg-[#0EA5E9]/10 text-[#0369A1] border-[#0EA5E9]/25' : 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0]'
      }`}>
        <span className={`w-1 h-1 rounded-full ${openOk ? 'bg-[#0EA5E9]' : 'bg-[#CBD5E1]'}`} />
        OPEN {openOk ? '✓' : '•••'}
      </span>
      <span className={`px-1.5 py-px rounded-full text-[8px] font-black tracking-widest border flex items-center gap-1 ${
        closeOk ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25' : 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0]'
      }`}>
        <span className={`w-1 h-1 rounded-full ${closeOk ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'}`} />
        CLOSE {closeOk ? '✓' : '•••'}
      </span>
    </div>
  );
};

// Premium market logo — sky→teal gradient with subtle glow
const renderMarketLogo = (name: string) => {
  const letter = (name.charAt(0) || 'S').toUpperCase();
  return (
    <div className="relative flex items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#0EA5E9] via-[#0EA5E9] to-[#14B8A6] shadow-lg shadow-[#0EA5E9]/25 ring-1 ring-white/60 overflow-hidden">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.65),transparent_48%)]" />
      <span className="relative text-white font-black text-xl font-display tracking-tight drop-shadow-sm">
        {letter}
      </span>
    </div>
  );
};

interface HomeViewProps {
  markets: Market[];
  lucky: LuckyNumber | null;
  onRouteChange: (route: AppRoute) => void;
  onOpenAddFunds: () => void;
  onSelectMarket: (market: Market) => void;
  onOpenChart: (market: Market, focus?: 'jodi' | 'panel') => void;
}

/** Provider-published lucky numbers — rendered only when present, never fabricated. */
const LuckyStrip: React.FC<{ lucky: LuckyNumber | null }> = ({ lucky }) => {
  if (!lucky) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-center">
        <p className="text-sm font-black text-[#0F172A] tracking-wide">
          Today Satta Matka Lucky Number <span className="font-bold text-[#64748B]">— awaiting</span>
        </p>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] p-[1.5px] shadow-xl shadow-[#0F172A]/10">
      <div className="rounded-[14px] bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] px-4 py-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#0EA5E9]/20 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-[#14B8A6]/15 blur-2xl" />
        <div className="relative text-center">
          <p className="text-base font-black text-white uppercase tracking-widest text-center">
            Today Satta Matka Lucky Number
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-sm font-black font-mono">
              Ank (शुभांक): {lucky.ank}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[#0EA5E9] text-white text-sm font-black font-mono shadow">
              Final Ank: {lucky.finalAnk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Streaming strip of today's declares — the LIVE MATKA RESULT ticker. */
const LiveTicker: React.FC<{ markets: Market[] }> = ({ markets }) => {
  const today = todayISTStr();
  const live = markets.filter((m) => m.resultDate === today && m.result && m.result !== '***-**-***');
  if (live.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0EA5E9]" />
        </span>
        <p className="text-[11px] font-bold text-[#64748B]">
          LIVE MATKA RESULT — <span className="font-medium">aaj ka pehla declare yahan turant dikhega</span>
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444]" />
        </span>
        <p className="text-[11px] font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-1.5">
          <Radio size={12} className="text-[#EF4444]" />
          Live Matka Result — {live.length} declared today
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {live.map((m) => (
          <div
            key={m.id}
            className="shrink-0 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#0F172A] border border-white/10 shadow-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[10px] font-black text-white tracking-wide whitespace-nowrap">{m.name}</span>
            <span className="text-[10px] font-black font-mono text-[#7DD3FC] whitespace-nowrap">
              {/* Progressive: declared jodi, else revealed 1st digit ("0*"), else "--". */}
              {progressiveJodi(m.jodi, m.panel, '--')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({
  markets,
  lucky,
  onRouteChange,
  onOpenAddFunds,
  onSelectMarket,
  onOpenChart,
}) => {
  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-5">
      <LuckyStrip lucky={lucky} />
      <LiveTicker markets={markets} />
      {/* Premium Markets Header */}
      <div
        className="flex items-center justify-between px-1"
      >
        <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
          <span>Live Markets</span>
          <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-ping" />
          <span className="ml-1 px-2 py-0.5 rounded-full bg-[#0F172A] text-white text-[10px] font-black tracking-widest">14 PREMIUM</span>
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          IST Live
        </span>
      </div>

      {/* Markets Compact Cards */}
      {markets.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-[#0F172A]">No markets available</p>
          <p className="mt-1 text-xs text-[#6B7280]">Live markets will appear here once the server is reachable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {markets.map((market) => (
          <div
            key={market.id}
            onClick={() => onSelectMarket(market)}
            className={`relative group bg-white border-2 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_18px_36px_rgba(14,165,233,0.18)] hover:-translate-y-0.5 ${
              market.highlight
                ? 'border-[#0EA5E9]/70 hover:border-[#0EA5E9] shadow-sm'
                : 'border-[#E2E8F0] hover:border-[#0EA5E9]/50'
            }`}
          >
            {/* Top gold sheen */}
            <div
              className={`h-1 w-full ${
                market.highlight
                  ? 'bg-gradient-to-r from-[#0EA5E9] via-[#7DD3FC] to-[#0EA5E9]'
                  : 'bg-gradient-to-r from-[#D1D5DB] via-[#E5E7EB] to-[#D1D5DB] group-hover:from-[#0EA5E9] group-hover:via-[#7DD3FC] group-hover:to-[#0EA5E9]'
              } transition-colors`}
            />

            {/* Top row: logo + name + badges */}
            <div className="p-3 sm:p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Premium logo */}
                {renderMarketLogo(market.name)}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] tracking-wide truncate">
                      {market.name}
                    </h3>
                    {market.highlight && (
                      <span className="shrink-0 relative overflow-hidden bg-gradient-to-r from-[#F59E0B] via-[#EF4444] to-[#F59E0B] text-white text-[8px] px-2.5 py-1 rounded-full font-black uppercase flex items-center gap-1 shadow-md shadow-orange-500/20 border border-white/20">
                        <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10" />
                        <Flame size={10} className="fill-white drop-shadow-sm relative" />
                        <span className="relative tracking-widest">Hot</span>
                      </span>
                    )}
                    {market.isLive && (
                      <span className="shrink-0 relative bg-[#0F172A] text-[#EF4444] border border-[#EF4444] text-[8px] px-2 py-1 rounded-full font-black uppercase flex items-center gap-1.5 shadow-md shadow-red-500/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444] border border-white"></span>
                        </span>
                        Live
                      </span>
                    )}
                  </div>

                  {/* Timing + result date badge */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#6B7280]">
                    <Clock size={11} className="text-[#9CA3AF]" />
                    <span>{market.openTime} – {market.closeTime}</span>
                    <ResultDateBadge date={market.resultDate} />
                  </div>
                  {/* Open / Close declare status — lively per result string */}
                  <OpenCloseChips result={market.result} />
                </div>
              </div>

              {/* Chevron affordance */}
              <ChevronRight
                size={16}
                className="shrink-0 text-[#D1D5DB] group-hover:text-[#0EA5E9] group-hover:translate-x-0.5 transition-all mt-1"
              />
            </div>

            {/* Declared number line + action buttons (Jodi/Panel removed) */}
            <div className="px-3 sm:px-4 pb-3">
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                {/* Live number line: full open-jodi-close + timing,
                    e.g. "159-55-267" with "(09:40 - 10:40)" below in red. */}
                <div className="text-center mb-2">
                  <p className="text-base sm:text-lg font-black font-mono tracking-wide text-[#0F172A]">
                    {(() => {
                      // Progressive trio, exactly like declares land:
                      // nothing -> "***-**-***", open -> "569-0*-***",
                      // full -> "159-55-267".
                      const raw = (market.result || '').trim();
                      if (!raw) return '***-**-***';
                      if (!raw.includes('-')) return raw;
                      const parts = raw.split('-');
                      const open = parts[0] ?? '';
                      const mid = progressiveJodi(parts[1], open);
                      const close = parts[2] ?? '';
                      return `${open || '***'}-${mid}-${close || '***'}`;
                    })()}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#EF4444]">
                    ({market.openTime} - {market.closeTime})
                  </p>
                </div>

              {/* Action buttons — equal width, symmetric.
                  CHARTS = secondary (outlined), Play Now = primary CTA. */}
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenChart(market); }}
                  className="flex items-center justify-center gap-1 py-2 rounded-xl bg-white border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white text-[#0F172A] font-bold text-[10px] sm:text-xs transition"
                >
                  <BarChart3 size={12} />
                  CHARTS
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onSelectMarket(market); }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white font-extrabold text-[10px] sm:text-xs shadow-md shadow-black/20 active:scale-95 transition"
                >
                  <Play size={12} className="fill-white" />
                  Play Now
                </button>
              </div>
            </div>

            {/* Timing bar at bottom */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1F2937] px-3 sm:px-4 py-1.5 text-[#F5F5F5] flex items-center justify-between text-[9px] sm:text-[10px] font-bold tracking-wide">
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-[#0EA5E9]" />
                <span>Open <span className="text-[#0EA5E9]">{market.openTime}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <span>Close <span className="text-[#0EA5E9]">{market.closeTime}</span></span>
              </div>
            </div>
          </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};
