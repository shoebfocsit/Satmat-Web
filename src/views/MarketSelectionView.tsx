import React, { useEffect, useState } from 'react';
import { Market, MarketGameType } from '../types';
import { api, MarketStatus } from '../lib/api';
import { formatCountdown, useServerCountdown } from '../hooks/useMarketCountdown';
import {
  Calendar,
  Hash,
  Layers,
  Grid,
  Boxes,
  Disc,
  Layers2,
  Sparkles,
  ChevronRight,
  Trophy,
} from 'lucide-react';

interface MarketSelectionViewProps {
  selectedMarket: Market | null;
  gameTypes: MarketGameType[];
  onBack: () => void;
  onSelectGameType: (gameType: MarketGameType) => void;
  onOpenChart: () => void;
}

// Premium logo-like icon rendering per game type
const renderGameIcon = (iconName: string, size = 26) => {
  const style = {
    wrapper:
      'relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] shadow-lg shadow-[#0EA5E9]/30 ring-1 ring-[#0F172A]/5 overflow-hidden',
    inner: 'absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_45%)]',
  };
  switch (iconName) {
    case '1':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <span className="relative text-[#0F172A] font-black text-2xl sm:text-3xl font-display">
            1
          </span>
        </div>
      );
    case '1_stack':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Layers size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case '2':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <span className="relative text-[#0F172A] font-black text-2xl sm:text-3xl font-display">
            2
          </span>
        </div>
      );
    case '2_stack':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Grid size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'panna_1':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Hash size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'panna_2':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Boxes size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'panna_3':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Layers2 size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'half_s':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Disc size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'full_s':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <Sparkles size={size} className="relative text-[#0F172A] stroke-[2.4]" />
        </div>
      );
    case 'motor':
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <span className="relative text-[#0F172A] font-black text-[11px] tracking-tighter leading-none text-center">
            7<span className="text-[9px]">ANK</span>
          </span>
        </div>
      );
    default:
      return (
        <div className={`${style.wrapper} w-14 h-14 sm:w-16 sm:h-16`}>
          <div className={style.inner} />
          <span className="relative text-[#0F172A] font-black text-2xl font-display">
            1
          </span>
        </div>
      );
  }
};

export const MarketSelectionView: React.FC<MarketSelectionViewProps> = ({
  selectedMarket,
  gameTypes,
  onBack,
  onSelectGameType,
  onOpenChart,
}) => {
  const marketName = selectedMarket ? selectedMarket.name : 'SATMAT';
  const openCount = gameTypes.filter((g) => g.isOpen).length;

  // Server-authoritative status (UI hint only — POST /bids re-validates).
  // Falls back to the list payload (status/canBid) when the endpoint is
  // unreachable; never blocks viewing game types, only bid entry.
  const [status, setStatus] = useState<MarketStatus | null>(null);
  const [gateMsg, setGateMsg] = useState<string>('');
  useEffect(() => {
    if (!selectedMarket) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      api
        .marketStatus(selectedMarket.id)
        .then((s) => {
          if (!cancelled) {
            setStatus(s);
            setGateMsg('');
          }
        })
        .catch(() => {
          if (!cancelled) setStatus(null);
        });
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedMarket?.id]);

  const effectiveCanBid = status ? status.canBid : (selectedMarket?.canBid ?? true);
  const effectiveStatus = status?.status ?? selectedMarket?.status ?? 'OPEN';
  const countdownTarget =
    effectiveStatus === 'OPEN' ? (status?.closesAt ?? null) : effectiveStatus === 'SCHEDULED' ? (status?.opensAt ?? null) : null;
  const remaining = useServerCountdown(countdownTarget, status?.serverTime ?? selectedMarket?.serverTime);
  // Auto-refresh the status the moment the window flips.
  useEffect(() => {
    if (remaining === null || !selectedMarket) return;
    if (remaining <= 0) {
      api
        .marketStatus(selectedMarket.id)
        .then(setStatus)
        .catch(() => undefined);
    }
  }, [remaining === null ? null : remaining <= 0, selectedMarket?.id]);

  const statusLabel =
    effectiveStatus === 'OPEN'
      ? 'OPEN'
      : effectiveStatus === 'SCHEDULED'
        ? 'OPENS SOON'
        : effectiveStatus === 'RESULT_DECLARED'
          ? 'DECLARED'
          : 'CLOSED';

  const handlePick = (gt: MarketGameType) => {
    if (!gt.isOpen) return;
    if (!effectiveCanBid) {
      setGateMsg(
        effectiveStatus === 'SCHEDULED'
          ? `Market opens at ${selectedMarket?.openTime}. Betting is not open yet.`
          : effectiveStatus === 'RESULT_DECLARED'
            ? 'Result already declared. Betting is closed for this session.'
            : 'Market is closed. Betting is no longer available.',
      );
      return;
    }
    onSelectGameType(gt);
  };

  return (
    <div className="pb-12 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-5">
      {/* Premium Market Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1F2937] to-[#0F172A] border border-[#0EA5E9]/30 p-4 sm:p-5 shadow-xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#0EA5E9]/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-[#0EA5E9]/10 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <button
            onClick={onOpenChart}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-white/5 border border-white/10 hover:border-[#0EA5E9]/50 hover:bg-white/10 transition group"
            aria-label="Open chart history"
          >
            <Calendar size={18} className="text-[#0EA5E9]" />
            <span className="text-xs font-bold text-white tracking-wide uppercase">
              {marketName}
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#F5F5F5]">
              <Trophy size={12} className="text-[#0EA5E9]" />
              {openCount} games open
            </span>
            <div
              className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-md ${
                effectiveStatus === 'OPEN'
                  ? 'bg-[#0EA5E9] text-[#0F172A] shadow-[#0EA5E9]/40'
                  : effectiveStatus === 'SCHEDULED'
                    ? 'bg-[#F59E0B] text-[#0F172A] shadow-[#F59E0B]/30'
                    : 'bg-[#EF4444] text-white shadow-[#EF4444]/30'
              }`}
              title="Server-checked market status (final decision is always made by the server)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${effectiveStatus === 'OPEN' ? 'bg-[#0F172A] animate-ping' : 'bg-current'}`} />
              {statusLabel}
              {remaining !== null && remaining > 0 && countdownTarget && (
                <span className="font-mono tabular-nums">• {formatCountdown(remaining)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Timing strip */}
        {selectedMarket && (
          <div className="relative mt-3 flex items-center gap-4 text-[10px] sm:text-[11px] font-semibold text-[#9CA3AF] flex-wrap">
            <span>
              Open <span className="text-[#0EA5E9] font-bold">{selectedMarket.openTime}</span>
            </span>
            <span className="text-[#0EA5E9]">•</span>
            <span>
              Close <span className="text-[#0EA5E9] font-bold">{selectedMarket.closeTime}</span>
            </span>
            {remaining !== null && remaining > 0 && countdownTarget && (
              <>
                <span className="text-[#0EA5E9]">•</span>
                <span className="text-white font-bold font-mono tabular-nums">
                  {effectiveStatus === 'OPEN' ? 'Closes in ' : 'Opens in '}
                  {formatCountdown(remaining)}
                </span>
              </>
            )}
            {selectedMarket.highlight && (
              <span className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] border border-[#0EA5E9]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />
                Hot
              </span>
            )}
          </div>
        )}
        {/* Gate message: UI hint only — the server makes the final decision. */}
        {gateMsg && (
          <div className="relative mt-3 px-3 py-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] text-[11px] font-bold text-center">
            {gateMsg}
          </div>
        )}
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {gameTypes.map((gt) => (
          <div
            key={gt.id}
            onClick={() => handlePick(gt)}
            className={`relative group rounded-3xl overflow-hidden border-2 transition-all duration-300 select-none flex flex-col ${
              gt.isOpen
                ? 'bg-white border-[#E2E8F0] hover:border-[#0EA5E9]/40 hover:shadow-[0_16px_32px_rgba(14,165,233,0.15)] active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-1'
                : 'bg-[#F8FAFC]/80 border-[#E2E8F0] opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Top sheen */}
            <div
              className={`h-1 w-full ${
                gt.isOpen
                  ? 'bg-gradient-to-r from-[#0EA5E9] via-[#7DD3FC] to-[#0EA5E9]'
                  : 'bg-[#D1D5DB]'
              }`}
            />

            {/* Icon + code */}
            <div className="p-4 sm:p-5 flex flex-col items-center justify-center text-center">
              <div className="relative mb-3">
                {renderGameIcon(gt.iconName)}
                {gt.code && gt.isOpen && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-gradient-to-r from-[#0F172A] via-[#0F172A] to-[#1E293B] text-white text-[8px] sm:text-[9px] font-black tracking-[0.12em] shadow-lg shadow-black/20 border border-white/10 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#0EA5E9] animate-pulse" />
                    {gt.code}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm sm:text-base font-extrabold text-[#0F172A] leading-snug tracking-tight">
                {gt.title}
              </h4>

              {/* Fancy CTA pill */}
              {gt.isOpen && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-black/10 group-hover:bg-[#2563EB] group-hover:shadow-[#2563EB]/20 transition-colors">
                  <span>Play</span>
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition">
                    <ChevronRight size={12} className="stroke-[2.8] text-white" />
                  </span>
                </div>
              )}
            </div>

            {/* Fancy CLOSED Overlay */}
            {!gt.isOpen && (
              <div className="absolute inset-0 bg-[#0F172A]/75 backdrop-blur-[3px] rounded-3xl flex items-center justify-center pointer-events-none z-10">
                <div className="relative bg-white border border-[#E2E8F0] text-[#0F172A] font-black text-[11px] px-4 py-2 rounded-full shadow-xl tracking-[0.14em] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                  Closed
                  <span className="w-px h-3 bg-[#E2E8F0] mx-1" />
                  <span className="text-[#64748B] font-bold normal-case tracking-normal">Opens next session</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
