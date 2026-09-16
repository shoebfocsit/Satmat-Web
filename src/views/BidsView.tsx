import React, { useState } from 'react';
import { Bid, AppRoute } from '../types';
import { Ticket, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

interface BidsViewProps {
  bids: Bid[];
  onRouteChange: (route: AppRoute) => void;
}

export const BidsView: React.FC<BidsViewProps> = ({ bids: initialBids, onRouteChange }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'won' | 'lost' | 'cancelled'>('all');
  const [bids, setBids] = useState(initialBids);
  const { showToast } = useToast();
  React.useEffect(() => setBids(initialBids), [initialBids]);
  const idemKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const handleCancel = async (id: string) => {
    try {
      await api.cancelBid(id, idemKey());
      setBids((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)));
      showToast('success', 'Bid cancelled');
    } catch (e: any) {
      showToast('error', e?.message || 'Cancel failed');
    }
  };

  const filteredBids = bids.filter((bid) => {
    if (activeTab === 'pending') return bid.status === 'pending';
    if (activeTab === 'won') return bid.status === 'won';
    if (activeTab === 'lost') return bid.status === 'lost';
    if (activeTab === 'cancelled') return bid.status === 'cancelled';
    return true;
  });

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['all', 'pending', 'won', 'lost', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition shrink-0 ${
              activeTab === tab
                ? 'bg-[#0EA5E9] text-[#0F172A] shadow-md shadow-[#2563EB]/20'
                : 'bg-[#E5E7EB] text-[#0F172A] border border-[#D1D5DB] hover:bg-[#F8FAFC]'
            }`}
          >
            {tab === 'all' ? '• All Bids' : tab}
          </button>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm min-h-[360px] flex flex-col">
        {filteredBids.length === 0 ? (
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF] shadow-inner">
              <Ticket size={36} />
            </div>

            <h3 className="text-xl font-bold text-[#0F172A]">No bets found</h3>

            <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">
              Your betting history will appear here once you place a bid.
            </p>

            <button
              onClick={() => onRouteChange('/')}
              className="mt-4 py-3 px-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#2563EB]/20 active:scale-95 transition"
            >
              <span>Go to Home</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E5E7EB] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                    {bid.marketName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                      bid.status === 'pending'
                        ? 'bg-[#0EA5E9]/20 text-[#0F172A] border border-[#0EA5E9]/40'
                        : bid.status === 'won'
                        ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                        : bid.status === 'cancelled'
                        ? 'bg-[#6B7280]/15 text-[#6B7280] border border-[#6B7280]/30'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    {bid.status === 'pending' && <Clock size={10} />}
                    {bid.status === 'won' && <CheckCircle2 size={10} />}
                    {(bid.status === 'lost' || bid.status === 'cancelled') && <XCircle size={10} />}
                    {bid.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#0F172A]">
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">
                      Game: {bid.gameType}
                    </span>
                    <span className="font-bold text-[#0F172A] text-sm">
                      Digit: {bid.numberSelected}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[#6B7280] block text-[11px]">
                      Amount
                    </span>
                    <span className="font-mono font-black text-sm text-[#0F172A]">
                      ₹{bid.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#E5E7EB] text-[10px] text-[#9CA3AF] flex items-center justify-between">
                  <span>ID: {bid.id}</span>
                  <div className="flex items-center gap-2">
                    {bid.status === 'pending' && (
                      <button onClick={() => handleCancel(bid.id)} className="text-[#EF4444] font-bold underline">
                        Cancel
                      </button>
                    )}
                    <span>{bid.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
