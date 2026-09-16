import React, { useState, useEffect } from 'react';
import { Bid, Order, AppRoute } from '../types';
import {
  ClipboardList,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';

interface OrderRecordViewProps {
  bids: Bid[];
  onRouteChange: (route: AppRoute) => void;
}

export const OrderRecordView: React.FC<OrderRecordViewProps> = ({
  bids,
  onRouteChange,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'won' | 'lost' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    api.orders({ page: 1, limit: 50 })
      .then((res) => setOrders(res.items as Order[]))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  // Prefer real orders when available, fallback to bids-derived orders
  const useOrders = orders.length > 0;
  const displayOrders = useOrders
    ? orders.map((o) => ({
        id: o.id,
        marketName: o.marketName,
        gameType: o.type,
        numberSelected: '-',
        amount: o.amount,
        status: (o.status.toLowerCase() as Bid['status']) || 'pending',
        date: new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))
    : bids;

  const filteredBids = displayOrders.filter((bid) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'pending'
        ? bid.status === 'pending'
        : activeTab === 'won'
        ? bid.status === 'won'
        : activeTab === 'lost'
        ? bid.status === 'lost'
        : bid.status === 'cancelled';

    const matchesSearch =
      bid.marketName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.gameType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.numberSelected.includes(searchTerm);

    return matchesTab && matchesSearch;
  });

  const totalOrders = displayOrders.length;
  const totalAmountSpent = displayOrders.reduce((acc, b) => acc + b.amount, 0);
  const totalWon = displayOrders.filter((b) => b.status === 'won').length;

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0EA5E9]/20 text-[#0F172A]">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#0F172A]">Order Record</h2>
              <p className="text-[11px] text-[#6B7280]">
                Track all your game bids & order history
              </p>
            </div>
          </div>
          <span className="bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#16A34A] text-xs px-2.5 py-1 rounded-full font-bold">
            Live
          </span>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E5E7EB] text-center">
          <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block uppercase font-bold">
              Total Orders
            </span>
            <span className="font-mono font-extrabold text-sm text-[#0F172A]">
              {totalOrders}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block uppercase font-bold">
              Total Amount
            </span>
            <span className="font-mono font-extrabold text-sm text-[#0F172A]">
              ₹{totalAmountSpent.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block uppercase font-bold">
              Won Orders
            </span>
            <span className="font-mono font-extrabold text-sm text-[#0F172A]">
              {totalWon}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Order ID, Market or Digit..."
          className="w-full bg-white border border-[#D1D5DB] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0EA5E9]"
        />
      </div>

      {/* Status Filter Tabs */}
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
            {tab === 'all'
              ? '• All Orders'
              : tab === 'pending'
              ? 'Open Orders'
              : tab === 'won'
              ? 'Won Orders'
              : tab === 'lost'
              ? 'Closed / Lost'
              : 'Cancelled'}
          </button>
        ))}
      </div>

      {/* Main Orders List Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm min-h-[360px] flex flex-col">
        {filteredBids.length === 0 ? (
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF] shadow-inner">
              <ClipboardList size={36} />
            </div>

            <h3 className="text-xl font-bold text-[#0F172A]">No Order Records</h3>

            <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">
              {searchTerm
                ? 'No order records matching your search query.'
                : 'You have not placed any orders yet. Select a market from home to start.'}
            </p>

            <button
              onClick={() => onRouteChange('/')}
              className="mt-4 py-3 px-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#2563EB]/20 active:scale-95 transition"
            >
              <span>Explore Markets</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E5E7EB] space-y-2.5 hover:border-[#D1D5DB] transition"
              >
                {/* Header line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                      {bid.marketName}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-mono">
                      #{bid.id}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                      bid.status === 'pending'
                        ? 'bg-[#0EA5E9]/20 text-[#0F172A] border border-[#0EA5E9]/40'
                        : bid.status === 'won'
                        ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    {bid.status === 'pending' && <Clock size={10} />}
                    {bid.status === 'won' && <CheckCircle2 size={10} />}
                    {bid.status === 'lost' && <XCircle size={10} />}
                    {bid.status}
                  </span>
                </div>

                {/* Main details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <span className="text-[#6B7280] block text-[10px] font-semibold uppercase">
                      Game Type
                    </span>
                    <span className="font-bold text-[#0F172A]">{bid.gameType}</span>
                  </div>

                  <div>
                    <span className="text-[#6B7280] block text-[10px] font-semibold uppercase">
                      Number / Digit
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      {bid.numberSelected}
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="text-[#6B7280] block text-[10px] font-semibold uppercase">
                      Order Amount
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      ₹{bid.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="text-[#6B7280] block text-[10px] font-semibold uppercase">
                      Order Date
                    </span>
                    <span className="text-[#0F172A] text-[11px]">{bid.date}</span>
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
