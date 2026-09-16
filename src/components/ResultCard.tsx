import React from 'react';
import type { ResultMarket } from '../types';
import { progressiveJodi } from './DpBossChart';

interface ResultCardProps {
  market: ResultMarket;
  onOpenChart?: (marketId: string, focus: 'jodi' | 'panel') => void;
}

/**
 * Market result panel mirroring the Flutter `PanelCard` (master "Diamond
 * Panel" design). Flat full-width panel:
 *   - Highlighted markets (DIAMOND, PRABHAT): bright yellow background with
 *     blue text; normal markets: white background with dark text.
 *   - Red rounded "Jodi" / "Panel" label pills flank the centered result
 *     (`open-jodi-close`), with the market time centered below.
 */
export const ResultCard: React.FC<ResultCardProps> = ({ market, onOpenChart }) => {
  const { id, name, openTime, closeTime, highlight, result } = market;

  const resultText = (() => {
    if (!result) return '--';
    const jodi = (result.jodi ?? '').trim();
    const panel = (result.panel ?? '').trim();
    const open = (result.open ?? '').trim();
    const close = (result.close ?? '').trim();
    if (open && jodi && close) return `${open}-${jodi}-${close}`;
    // Progressive: open reveals the jodi's 1st digit ("569-0*"), close the 2nd.
    const pj = progressiveJodi(jodi || null, open || panel || null);
    if (panel && pj !== '**') return `${panel}-${pj}`;
    if (panel) return panel;
    if (jodi) return jodi;
    return '--';
  })();

  const fg = highlight ? '#1D4ED8' : '#0F172A';
  const date = result?.date ?? null;
  let isToday = false;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const today = `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
    isToday = !!date && date === today;
  } catch {
    isToday = false;
  }
  const openOk = !!(result?.open && /^\d{3}$/.test(result.open.trim()));
  const closeOk = !!(result?.close && /^\d{3}$/.test(result.close.trim()));

  return (
    <div
      className="w-full px-2.5 py-3.5"
      style={{ backgroundColor: highlight ? '#FFEB3B' : '#FFFFFF' }}
    >
      <p
        className="text-center text-[14px] sm:text-[15px] font-black uppercase tracking-wide leading-snug truncate"
        style={{ color: fg }}
      >
        {name}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        {date ? (
          <span className={`px-2 py-px rounded-full text-[9px] font-black tracking-widest border ${
            isToday
              ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30'
              : 'bg-black/5 text-[#64748B] border-black/10'
          }`}>
            {isToday ? `TODAY • ${date.slice(8)}/${date.slice(5, 7)}` : date.slice(8) + '/' + date.slice(5, 7)}
          </span>
        ) : (
          <span className="px-2 py-px rounded-full text-[9px] font-black tracking-widest bg-black/5 text-[#94A3B8] border border-black/10">
            AWAITING
          </span>
        )}
        <span className={`px-2 py-px rounded-full text-[9px] font-black tracking-widest border ${openOk ? 'bg-[#0EA5E9]/10 text-[#0369A1] border-[#0EA5E9]/30' : 'bg-black/5 text-[#94A3B8] border-black/10'}`}>
          OPEN {openOk ? '✓' : '•••'}
        </span>
        <span className={`px-2 py-px rounded-full text-[9px] font-black tracking-widest border ${closeOk ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30' : 'bg-black/5 text-[#94A3B8] border-black/10'}`}>
          CLOSE {closeOk ? '✓' : '•••'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2.5 sm:gap-3.5">
        <button
          type="button"
          onClick={() => onOpenChart?.(id, 'jodi')}
          disabled={!onOpenChart}
          className="w-[64px] sm:w-[76px] h-[28px] sm:h-[34px] shrink-0 rounded-full bg-[#EF4444] text-white text-[11px] sm:text-[13px] font-extrabold flex items-center justify-center hover:bg-[#EF4444] disabled:cursor-default disabled:opacity-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-1"
          aria-label={`Open Jodi live chart for ${name}`}
          title={onOpenChart ? 'Jodi ka live chart dekhein' : undefined}
        >
          Jodi
        </button>
        <span
          className="min-w-0 text-center text-[18px] sm:text-[20px] font-black tracking-wide truncate"
          style={{ color: fg }}
        >
          {resultText}
        </span>
        <button
          type="button"
          onClick={() => onOpenChart?.(id, 'panel')}
          disabled={!onOpenChart}
          className="w-[64px] sm:w-[76px] h-[28px] sm:h-[34px] shrink-0 rounded-full bg-[#EF4444] text-white text-[11px] sm:text-[13px] font-extrabold flex items-center justify-center hover:bg-[#EF4444] disabled:cursor-default disabled:opacity-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-1"
          aria-label={`Open Panel live chart for ${name}`}
          title={onOpenChart ? 'Panel ka live chart dekhein' : undefined}
        >
          Panel
        </button>
      </div>

      <p
        className="mt-2.5 text-center text-[11px] sm:text-[13px] font-bold"
        style={{ color: fg }}
      >
        {openTime} {closeTime}
      </p>
    </div>
  );
};
