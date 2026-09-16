import React from 'react';
import { Trophy, Compass, Award } from 'lucide-react';
import { AppRoute } from '../types';

interface WinningItem {
  id: string;
  marketName: string;
  gameType: string;
  number: string;
  amount: number;
  wonAmount: number;
  date: string;
}

interface WinningsViewProps {
  totalWinnings?: number;
  winningCount?: number;
  winningItems?: WinningItem[];
  onRouteChange: (route: AppRoute) => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const WinningsView: React.FC<WinningsViewProps> = ({
  totalWinnings = 0.0,
  winningCount = 0,
  winningItems = [],
  onRouteChange,
}) => {
  const hasWinnings = winningItems.length > 0;

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Total Winnings Card */}
      <div className="bg-gradient-to-b from-[#0EA5E9] to-[#F8FAFC] rounded-3xl p-5 text-[#0F172A] shadow-2xl border border-[#9CA3AF]/30 text-center relative overflow-hidden">
        <span className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-widest block mb-1">
          TOTAL WINNINGS
        </span>

        <div className="text-3xl font-black font-mono tracking-tight text-[#0F172A] mb-2">
          ₹{totalWinnings.toFixed(2)}
        </div>

        <div className="inline-flex items-center gap-1.5 bg-white/60 border border-[#9CA3AF]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#0F172A]">
          <span className="w-2 h-2 rounded-full bg-[#0EA5E9]" />
          <span>{winningCount} winning bets</span>
        </div>
      </div>

      {hasWinnings ? (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#0F172A] tracking-wide flex items-center gap-2">
            <Award size={18} className="text-[#0EA5E9]" />
            Winning Bets
          </h3>
          <div className="space-y-2.5">
            {winningItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 text-[#0F172A] flex items-center justify-center">
                    <Trophy size={20} className="stroke-[2]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#0F172A] truncate max-w-[160px]">
                      {item.marketName}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                      <span className="font-mono text-[#6B7280]">#{item.id}</span>
                      <span>•</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:flex sm:items-center sm:gap-4 sm:flex-1">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-[#6B7280] block uppercase font-semibold">
                      Game
                    </span>
                    <span className="font-bold text-[#0F172A] text-sm">{item.gameType}</span>
                  </div>
                  <div className="text-center sm:text-left mt-1 sm:mt-0">
                    <span className="text-[10px] text-[#6B7280] block uppercase font-semibold">
                      Number
                    </span>
                    <span className="font-bold text-[#0F172A] text-sm">{item.number}</span>
                  </div>
                  <div className="text-center sm:text-left mt-1 sm:mt-0">
                    <span className="text-[10px] text-[#6B7280] block uppercase font-semibold">
                      Bet Amount
                    </span>
                    <span className="font-mono font-bold text-[#737373] text-sm">₹{item.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-center sm:text-left mt-1 sm:mt-0">
                    <span className="text-[10px] text-[#6B7280] block uppercase font-semibold">
                      Won Amount
                    </span>
                    <span className="font-mono font-black text-[#16A34A] text-lg">+₹{item.wonAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 text-center shadow-sm space-y-4 py-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF] shadow-inner">
            <Trophy size={40} className="stroke-[2]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-[#0F172A]">No winnings yet</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto leading-relaxed">
              Your winning bets will appear here once the results are declared.
            </p>
          </div>

          <button
            onClick={() => onRouteChange('/')}
            className="mt-4 py-3 px-6 rounded-full bg-[#0F172A] border border-[#0F172A] hover:bg-[#1F2937] text-[#F5F5F5] font-bold text-xs inline-flex items-center gap-2 active:scale-95 transition"
          >
            <Compass size={16} className="text-[#0EA5E9]" />
            <span>Explore Games</span>
          </button>
        </div>
      )}
    </div>
  );
};