import React, { useState } from 'react';
import { Transaction, AppRoute } from '../types';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  Receipt,
  ArrowDownRight,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface WalletViewProps {
  balance: number;
  transactions: Transaction[];
  onRouteChange: (route: AppRoute) => void;
  onOpenAddFunds: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  balance,
  transactions,
  onRouteChange,
  onOpenAddFunds,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'credit') return tx.type === 'credit';
    if (activeTab === 'debit') return tx.type === 'debit';
    return true;
  });

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Wallet Card (yellow → light gradient) */}
      <div className="bg-gradient-to-b from-[#0EA5E9] to-[#F8FAFC] rounded-3xl p-5 text-[#0F172A] shadow-2xl border border-[#9CA3AF]/30 relative overflow-hidden">
        {/* Subtle background circle */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/40 pointer-events-none" />

        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} className="text-[#0F172A]" />
          <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Available Balance
          </span>
        </div>

        {/* Balance Display */}
        <div className="text-3xl font-black font-mono tracking-tight text-[#0F172A] mb-5">
          ₹{balance.toFixed(2)}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenAddFunds}
            className="py-3 px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/30 active:scale-95 transition"
          >
            <div className="w-5 h-5 rounded-full bg-[#0F172A] text-[#0EA5E9] flex items-center justify-center">
              <Plus size={14} className="stroke-[3]" />
            </div>
            <span>Add Money</span>
          </button>

          <button
            onClick={() => onRouteChange('/finance')}
            className="py-3 px-4 rounded-2xl bg-white border border-[#9CA3AF]/60 hover:bg-[#F8FAFC] text-[#6B7280] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <ArrowUpRight size={18} className="text-[#6B7280]" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Transaction History Container */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-[#0F172A] tracking-wide">
          Transaction History
        </h3>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 sm:gap-2 border-b border-[#E5E7EB] pb-3 overflow-x-auto no-scrollbar">
          {(['all', 'credit', 'debit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold capitalize transition shrink-0 whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#0EA5E9] text-[#0F172A] shadow-md shadow-[#2563EB]/20'
                  : 'bg-[#F8FAFC] text-[#737373] border border-[#9CA3AF]/50 hover:bg-[#E5E7EB]'
              }`}
            >
              {tab === 'all' ? '• All' : tab}
            </button>
          ))}
        </div>

        {/* Content list or Empty State */}
        {filteredTransactions.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF]">
              <Receipt size={32} />
            </div>

            <h4 className="text-base font-bold text-[#0F172A]">
              No transactions found
            </h4>

            <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">
              Your recent deposits, withdrawals, and gameplay history will appear here.
            </p>

            <button
              onClick={() => onRouteChange('/')}
              className="mt-2 py-2.5 px-5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#2563EB]/20 active:scale-95 transition"
            >
              <span>Start Playing</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E5E7EB] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'credit'
                        ? 'bg-[#0EA5E9]/20 text-[#0F172A]'
                        : 'bg-[#737373]/15 text-[#737373]'
                    }`}
                  >
                    {tx.type === 'credit' ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-[#0F172A] truncate max-w-[140px] sm:max-w-[200px]">
                      {tx.title}
                    </h5>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                      <Clock size={10} />
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-extrabold text-sm sm:text-base ${
                      tx.type === 'credit' ? 'text-[#737373]' : 'text-[#A3A3A3]'
                    }`}
                  >
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-[#9CA3AF] capitalize">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
