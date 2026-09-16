import React from 'react';
import { GameRate } from '../types';
import { Info, TrendingUp, Sparkles, Crown, Zap, Award, Layers, Hash, Copy, Trophy } from 'lucide-react';

const iconFor = (gameType: string) => {
  const t = gameType.toLowerCase();
  if (t.includes('ank') || t.includes('single digit')) return Hash;
  if (t.includes('jodi')) return Copy;
  if (t.includes('single pana') || t === 'sp') return Layers;
  if (t.includes('double pana') || t === 'dp') return Layers;
  if (t.includes('triple pana') || t === 'tp') return Crown;
  if (t.includes('cycle')) return Zap;
  if (t.includes('half sangam') || t.includes('hf')) return Award;
  if (t.includes('full sangam') || t.includes('f.s')) return Trophy;
  if (t.includes('motor')) return Sparkles;
  return TrendingUp;
};

interface GameRatesViewProps {
  gameRates: GameRate[];
}

export const GameRatesView: React.FC<GameRatesViewProps> = ({ gameRates }) => {
  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-5">
      {/* Premium Header */}
      <div
        className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0EA5E9] via-[#0EA5E9] to-[#14B8A6] p-[1.5px] shadow-xl shadow-[#0EA5E9]/20"
      >
        <div className="rounded-[22px] bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#0EA5E9]/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#14B8A6]/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-[#0EA5E9]/30">
                <Crown size={22} className="text-white fill-white/20" />
              </div>
              <div>
                <h2 className="font-black text-lg text-white tracking-tight flex items-center gap-2">
                  Game Rates
                  <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold tracking-widest text-white">PREMIUM</span>
                </h2>
                <p className="text-xs text-white/70 font-medium mt-0.5">Highest payouts • Instant settlement</p>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1">
              <span className="px-3 py-1 rounded-full bg-[#2563EB] text-white text-[10px] font-black tracking-widest shadow-md">LIVE RATES</span>
              <span className="text-[10px] text-white/50 font-medium">{gameRates.length} markets</span>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-2.5 text-center">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Up to</p>
              <p className="text-sm font-black text-white">100000×</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-2.5 text-center">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Min Bet</p>
              <p className="text-sm font-black text-white">₹10</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-2.5 text-center">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Payout</p>
              <p className="text-sm font-black text-[#7DD3FC]">Instant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div
        className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex items-center gap-3 shadow-sm"
      >
        <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#0EA5E9]/20 flex items-center justify-center shrink-0">
          <Info size={16} className="text-[#0EA5E9]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#0F172A]">Best in Market Guaranteed</p>
          <p className="text-[11px] text-[#64748B] font-medium">All rates are live from backend — no manual markup. Play with confidence.</p>
        </div>
        <span className="ml-auto hidden sm:inline-flex px-2.5 py-1 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 text-[10px] font-black text-[#16A34A] tracking-widest">VERIFIED</span>
      </div>

      {/* Premium Rates Grid */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-4 sm:p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#0EA5E9] to-[#14B8A6]" />
            Payout Table
          </h3>
          <span className="text-[10px] font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-full">Updated live</span>
        </div>

        {gameRates.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto">
              <TrendingUp size={22} className="text-[#94A3B8]" />
            </div>
            <p className="mt-3 text-sm font-bold text-[#0F172A]">Fetching live rates…</p>
            <p className="text-xs text-[#64748B]">Connect to backend to see premium payouts</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {gameRates.map((rate) => {
              const Icon = iconFor(rate.gameType);
              const isHighlight = rate.gameType.includes('JODI') || rate.gameType.includes('Full Sangam') || rate.gameType.includes('ANK');
              return (
                <div
                  key={rate.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-3.5 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isHighlight
                      ? 'bg-gradient-to-br from-white to-[#F0F9FF] border-[#0EA5E9]/30 shadow-sm hover:shadow-[#0EA5E9]/15 hover:border-[#0EA5E9]/50'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0EA5E9]/20 hover:shadow-md'
                  }`}
                >
                  {isHighlight && <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#0EA5E9] via-[#14B8A6] to-[#0EA5E9]" />}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isHighlight ? 'bg-gradient-to-br from-[#0EA5E9] to-[#14B8A6] text-white shadow-[#0EA5E9]/20' : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0EA5E9]'}`}>
                    <Icon size={18} className={isHighlight ? 'fill-white/20' : ''} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-[#0F172A] leading-tight truncate">{rate.gameType}</p>
                    <p className="text-[10px] font-medium text-[#64748B]">Min ₹10</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black font-mono tracking-tight border shadow-sm ${isHighlight ? 'bg-gradient-to-r from-[#0F172A] via-[#0F172A] to-[#1E293B] text-white border-white/10 shadow-black/15' : 'bg-white text-[#0F172A] border-[#E2E8F0] group-hover:bg-[#0F172A] group-hover:text-white group-hover:border-[#0F172A] group-hover:shadow-md'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHighlight ? 'bg-[#0EA5E9] shadow shadow-[#0EA5E9]/50' : 'bg-[#0EA5E9]'}`} />
                      {rate.rateRange}
                    </p>
                    <p className="text-[9px] font-bold text-[#16A34A] mt-1 flex items-center justify-end gap-1"><span className="w-1 h-1 rounded-full bg-[#16A34A]" /> Live</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          Rates auto-sync every 60s from backend • No hidden charges
        </div>
      </div>
    </div>
  );
};
