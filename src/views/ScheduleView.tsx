import React from 'react';
import { Market } from '../types';
import { CalendarClock, Clock } from 'lucide-react';

interface ScheduleViewProps {
  markets: Market[];
}

/** Live status derived from backend flags (computed IST-side every request). */
function statusOf(m: Market): { label: string; live: boolean; closed: boolean } {
  if (m.isLive) return { label: 'LIVE', live: true, closed: false };
  if (m.isClosed) return { label: 'CLOSED', live: false, closed: true };
  return { label: 'UPCOMING', live: false, closed: false };
}

const StatusPill: React.FC<{ m: Market }> = ({ m }) => {
  const s = statusOf(m);
  if (s.live) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EF4444] text-white text-[10px] font-black tracking-widest shadow-sm">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
        LIVE
      </span>
    );
  }
  if (s.closed) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] text-[10px] font-black tracking-widest">
        CLOSED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0369A1] border border-[#0EA5E9]/25 text-[10px] font-black tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
      UPCOMING
    </span>
  );
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({ markets }) => {
  const sorted = [...markets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // Day games (order 1-7) first, then night games — like the official schedule.
  const day = sorted.filter((m) => (m.order ?? 0) <= 7);
  const night = sorted.filter((m) => (m.order ?? 0) > 7);

  const renderTable = (list: Market[]) => (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-2 px-3 sm:px-4 py-2.5 bg-[#0F172A] text-[9px] sm:text-[10px] font-black text-white/70 uppercase tracking-widest items-center">
        <span>Market Name</span>
        <span className="text-center w-20 sm:w-24">Open Time</span>
        <span className="text-center w-20 sm:w-24">Close Time</span>
        <span className="text-right w-24 sm:w-28">Status</span>
      </div>
      {list.map((m, i) => (
        <div
          key={m.id}
          className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 sm:px-4 py-2.5 items-center border-b border-[#F1F5F9] last:border-b-0 ${
            i % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'
          }`}
        >
          <span className="text-xs sm:text-sm font-black text-[#0F172A] tracking-wide truncate">
            {m.name}
          </span>
          <span className="w-20 sm:w-24 text-center text-[11px] sm:text-xs font-bold text-[#0F172A] font-mono">
            {m.openTime}
          </span>
          <span className="w-20 sm:w-24 text-center text-[11px] sm:text-xs font-bold text-[#0F172A] font-mono">
            {m.closeTime}
          </span>
          <span className="w-24 sm:w-28 flex justify-end">
            <StatusPill m={m} />
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3 px-1">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center shadow-md shrink-0">
          <CalendarClock size={18} className="text-white" />
        </span>
        <div>
          <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">
            Full Schedule
          </h2>
          <p className="text-[11px] font-medium text-[#64748B] flex items-center gap-1">
            <Clock size={11} />
            IST timings • status updates live
          </p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-[#0F172A] text-white text-[10px] font-black tracking-widest">
          {markets.length} MARKETS
        </span>
      </div>

      {markets.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-[#0F172A]">Schedule unavailable</p>
          <p className="mt-1 text-xs text-[#64748B]">Pull down to retry once the server is reachable.</p>
        </div>
      ) : (
        <>
          <div>
            <h3 className="px-1 mb-2 text-[11px] font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-1 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#14B8A6]" />
              Day Games
            </h3>
            {renderTable(day)}
          </div>
          <div>
            <h3 className="px-1 mb-2 text-[11px] font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-1 rounded-full bg-gradient-to-r from-[#0F172A] to-[#475569]" />
              Night Games
            </h3>
            {renderTable(night)}
          </div>
        </>
      )}
    </div>
  );
};
