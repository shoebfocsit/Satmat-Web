import React, { useState, useCallback, useEffect } from 'react';
import { Transaction, AppRoute, BankDetails } from '../types';
import { api } from '../lib/api';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  QrCode,
  ShieldCheck,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useRateLimit } from '../hooks/useRateLimit';
import {
  validateAmount,
  validateUpiId,
  sanitizeText,
} from '../lib/validation';

interface FinanceViewProps {
  balance: number;
  transactions: Transaction[];
  onRouteChange: (route: AppRoute) => void;
  onAddFunds: (amount: number) => Promise<boolean>;
  onWithdraw: (amount: number, payout: 'bank' | 'upi', upiId?: string) => Promise<boolean>;
  bankDetails?: BankDetails | null;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  balance,
  transactions,
  onRouteChange,
  onAddFunds,
  onWithdraw,
  bankDetails,
}) => {
  const { showToast } = useToast();
  const depositRateLimit = useRateLimit({ maxCalls: 5, windowMs: 60000, key: 'deposit' });
  const withdrawRateLimit = useRateLimit({ maxCalls: 3, windowMs: 60000, key: 'withdraw' });

  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw' | 'transactions'>('all');
  const [txFilter, setTxFilter] = useState<'all' | 'credit' | 'debit' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Funds form state
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('upi');
  const [upiId, setUpiId] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Array<{ id: string; amount: number; status: string; date: string }>>([]);
  useEffect(() => {
    api.withdrawals({ page: 1, limit: 20 }).then((res) => setWithdrawals(res.items as any)).catch(() => {});
  }, [balance]);

  // Quick Preset Amounts
  const presets = [100, 500, 1000, 2000, 5000];

  const handleDepositSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!depositRateLimit.checkLimit()) {
        setDepositError('Too many deposit attempts. Please wait a minute.');
        showToast('error', 'Too many attempts. Please wait.', 5000);
        return;
      }

      const validation = validateAmount(depositAmount, 10, 100000);
      if (!validation.valid) {
        setDepositError(validation.error || 'Invalid amount');
        showToast('error', validation.error || 'Invalid amount');
        return;
      }

      setDepositError(null);
      setIsDepositing(true);

      const ok = await onAddFunds(validation.value);
      setIsDepositing(false);
      if (!ok) {
        setDepositError('Deposit failed. Please try again.');
        return;
      }

      setDepositSuccess(`₹${validation.value.toFixed(2)} added to your wallet successfully!`);
      showToast('success', `₹${validation.value.toFixed(2)} added successfully!`);
      setTimeout(() => setDepositSuccess(null), 3000);
    },
    [depositAmount, depositRateLimit, onAddFunds, showToast]
  );

  const handleWithdrawSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!withdrawRateLimit.checkLimit()) {
        setWithdrawError('Too many withdrawal attempts. Please wait a minute.');
        showToast('error', 'Too many attempts. Please wait.', 5000);
        return;
      }

      setWithdrawError(null);
      setWithdrawSuccess(null);

      const amtValidation = validateAmount(withdrawAmount, 100, balance);
      if (!amtValidation.valid) {
        setWithdrawError(amtValidation.error || 'Invalid amount');
        showToast('error', amtValidation.error || 'Invalid amount');
        return;
      }

      if (payoutMethod === 'upi') {
        const upiValidation = validateUpiId(upiId);
        if (!upiValidation.valid) {
          setWithdrawError(upiValidation.error || 'Invalid UPI ID');
          showToast('error', upiValidation.error || 'Invalid UPI ID');
          return;
        }
      }

      setIsWithdrawing(true);

      const ok = await onWithdraw(
        amtValidation.value,
        payoutMethod,
        payoutMethod === 'upi' ? sanitizeText(upiId, 50).toLowerCase().trim() : undefined,
      );
      setIsWithdrawing(false);

      if (ok) {
        setWithdrawSuccess(`Withdrawal request of ₹${amtValidation.value.toFixed(2)} submitted successfully!`);
        showToast('success', `Withdrawal of ₹${amtValidation.value.toFixed(2)} submitted!`);
      } else {
        setWithdrawError('Failed to process withdrawal. Check your balance or payout details.');
        showToast('error', 'Failed to process withdrawal');
      }
      setTimeout(() => setWithdrawSuccess(null), 3500);
    },
    [withdrawAmount, balance, payoutMethod, upiId, withdrawRateLimit, onWithdraw, showToast]
  );

  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter =
      txFilter === 'all'
        ? true
        : txFilter === 'credit'
        ? tx.type === 'credit'
        : txFilter === 'debit'
        ? tx.type === 'debit'
        : tx.status === 'pending';

    const matchesSearch =
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.amount.toString().includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Top Main Finance Card */}
      <div className="bg-gradient-to-br from-[#0EA5E9] via-[#14B8A6] to-[#F8FAFC] rounded-3xl p-5 text-[#0F172A] shadow-2xl border border-[#A3A3A3]/40 relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-[#0F172A]" />
            <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Finance & Wallet
            </span>
          </div>
          <span className="bg-[#16A34A] text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
            Verified
          </span>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight text-[#0F172A] my-3">
          ₹{balance.toFixed(2)}
        </div>

        {/* Quick Mode Switches inside card */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#0F172A]/20">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'deposit'
                ? 'bg-white text-[#0F172A] shadow-md scale-105'
                : 'bg-[#0F172A]/10 text-[#0F172A] hover:bg-white/60'
            }`}
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Add Funds</span>
          </button>

          <button
            onClick={() => setActiveTab('withdraw')}
            className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'withdraw'
                ? 'bg-white text-[#0F172A] shadow-md scale-105'
                : 'bg-[#0F172A]/10 text-[#0F172A] hover:bg-white/60'
            }`}
          >
            <ArrowUpRight size={16} />
            <span>Withdraw</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'transactions' || activeTab === 'all'
                ? 'bg-[#0F172A] text-[#0EA5E9] border border-[#0EA5E9] shadow-md'
                : 'bg-[#0F172A]/10 text-[#0F172A] hover:bg-white/60'
            }`}
          >
            <Receipt size={15} />
            <span>Transactions</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(() => {
          const tabs = [
            { id: 'all', label: '• All Overview' },
            { id: 'deposit', label: 'Add Funds' },
            { id: 'withdraw', label: 'Withdraw' },
            { id: 'transactions', label: 'Transactions' },
          ];
          return tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'deposit' | 'withdraw' | 'transactions')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#0EA5E9] text-[#0F172A] shadow-md shadow-[#2563EB]/20'
                  : 'bg-[#E5E7EB] text-[#0F172A] border border-[#D1D5DB] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          ));
        })()}
      </div>

      {/* SECTION 1: ADD FUNDS FUNCTION */}
      {(activeTab === 'deposit' || activeTab === 'all') && (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-bold">
                <Plus size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Add Funds to Wallet</h3>
            </div>
            <span className="text-[10px] font-bold text-[#0F172A] bg-[#0EA5E9]/15 px-2.5 py-1 rounded-full border border-[#0EA5E9]/40">
              Instant UPI
            </span>
          </div>

          {depositSuccess && (
            <div className="bg-[#16A34A]/10 border border-[#16A34A] text-[#16A34A] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{depositSuccess}</span>
            </div>
          )}

          {depositError && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/60 text-[#EF4444] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{depositError}</span>
            </div>
          )}

          <form onSubmit={handleDepositSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Enter Deposit Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F172A] font-black text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setDepositAmount(val);
                    setDepositError(null);
                  }}
                  placeholder="Enter amount"
                  min={10}
                  max={100000}
                  required
                  disabled={isDepositing}
                  className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-2xl pl-8 pr-4 py-3 text-sm text-[#0F172A] font-mono font-bold focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                Quick Select Amount
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                {presets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDepositAmount(amt.toString());
                      setDepositError(null);
                    }}
                    disabled={isDepositing}
                    className={`py-2 rounded-xl text-xs font-extrabold font-mono transition disabled:opacity-50 ${
                      depositAmount === amt.toString()
                        ? 'bg-[#0EA5E9] text-[#0F172A] shadow-md shadow-[#2563EB]/20'
                        : 'bg-[#F8FAFC] border border-[#D1D5DB] text-[#0F172A] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isDepositing}
              className="w-full py-3.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-lg shadow-[#2563EB]/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>{isDepositing ? 'Processing...' : `Proceed to Add Money (₹${depositAmount || 0})`}</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 2: WITHDRAW FUNCTION */}
      {(activeTab === 'withdraw' || activeTab === 'all') && (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-bold">
                <ArrowUpRight size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Withdraw Funds</h3>
            </div>
            <span className="text-[10px] font-bold text-[#6B7280] bg-[#F8FAFC] px-2.5 py-1 rounded-full border border-[#E5E7EB]">
              Min. ₹100
            </span>
          </div>

          {withdrawError && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/60 text-[#EF4444] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawSuccess && (
            <div className="bg-[#16A34A]/10 border border-[#16A34A] text-[#16A34A] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{withdrawSuccess}</span>
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Withdrawal Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F172A] font-black text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setWithdrawAmount(val);
                    setWithdrawError(null);
                  }}
                  placeholder="Enter amount"
                  min={100}
                  max={balance}
                  required
                  disabled={isWithdrawing}
                  className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-2xl pl-8 pr-4 py-3 text-sm text-[#0F172A] font-mono font-bold focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
                />
              </div>
              <span className="text-[10px] text-[#6B7280] block mt-1">
                Available to withdraw: ₹{balance.toFixed(2)}
              </span>
            </div>

            {/* Payout method choice */}
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1.5">
                Payout Destination
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod('upi');
                    setWithdrawError(null);
                  }}
                  disabled={isWithdrawing}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition disabled:opacity-50 ${
                    payoutMethod === 'upi'
                      ? 'bg-[#0F172A] border-[#0EA5E9] text-[#0EA5E9]'
                      : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#0F172A]'
                  }`}
                >
                  <QrCode size={18} />
                  <div>
                    <span className="text-xs font-extrabold block">Instant UPI</span>
                    <span className="text-[10px] text-[#6B7280] block">GPay / PhonePe / Paytm</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod('bank');
                    setWithdrawError(null);
                  }}
                  disabled={isWithdrawing}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition disabled:opacity-50 ${
                    payoutMethod === 'bank'
                      ? 'bg-[#0F172A] border-[#0EA5E9] text-[#0EA5E9]'
                      : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#0F172A]'
                  }`}
                >
                  <Building2 size={18} />
                  <div>
                    <span className="text-xs font-extrabold block">Bank Account</span>
                    <span className="text-[10px] text-[#6B7280] block">Direct IMPS</span>
                  </div>
                </button>
              </div>
            </div>

            {payoutMethod === 'upi' ? (
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Enter UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => {
                    const val = sanitizeText(e.target.value.toLowerCase(), 50);
                    setUpiId(val);
                    setWithdrawError(null);
                  }}
                  placeholder="e.g. mobile@upi or username@okaxis"
                  disabled={isWithdrawing}
                  className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-2xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
                />
              </div>
            ) : (
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E5E7EB] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-bold">Saved Bank Account:</span>
                  <button
                    type="button"
                    onClick={() => onRouteChange('/bank-details')}
                    className="text-[#0F172A] underline text-[10px] font-bold"
                  >
                    Manage
                  </button>
                </div>

                {bankDetails ? (
                  <div className="text-[#0F172A] space-y-0.5">
                    <p className="font-extrabold">{sanitizeText(bankDetails.bankName)}</p>
                    <p className="font-mono text-[11px]">A/C: •••• {bankDetails.accountNumber.slice(-4)}</p>
                    <p className="text-[10px] text-[#6B7280]">IFSC: {bankDetails.ifscCode}</p>
                  </div>
                ) : (
                  <div className="text-[#6B7280] text-[11px] font-semibold flex items-center justify-between">
                    <span>No bank account linked yet.</span>
                    <button
                      type="button"
                      onClick={() => onRouteChange('/bank-details')}
                      className="bg-[#0EA5E9] text-[#0F172A] px-2.5 py-1 rounded-xl text-[10px] font-extrabold"
                    >
                      Add Details
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isWithdrawing}
              className="w-full py-3.5 rounded-2xl bg-[#0F172A] hover:bg-[#1F2937] text-[#F5F5F5] font-extrabold text-xs shadow-lg shadow-neutral-400/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight size={18} />
              <span>{isWithdrawing ? 'Processing...' : 'Submit Withdrawal Request'}</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION 3: TRANSACTIONS FUNCTION */}
      {(activeTab === 'transactions' || activeTab === 'all') && (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-bold">
                <Receipt size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">All User Transactions</h3>
            </div>
            <span className="text-[10px] text-[#6B7280] font-mono">
              Total: {transactions.length}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(sanitizeText(e.target.value, 100))}
              placeholder="Search transaction ID or title..."
              className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          {/* Transaction Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'credit', 'debit', 'pending'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTxFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold capitalize transition shrink-0 ${
                  txFilter === filter
                    ? 'bg-[#0EA5E9] text-[#0F172A] shadow-md shadow-[#2563EB]/20'
                    : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E5E7EB] hover:bg-[#E5E7EB]'
                }`}
              >
                {filter === 'all'
                  ? 'All Types'
                  : filter === 'credit'
                  ? '+ Credits / Deposits'
                  : filter === 'debit'
                  ? '- Debits / Withdrawals'
                  : 'Pending'}
              </button>
            ))}
          </div>

          {/* Transaction Items */}
          {filteredTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Receipt size={32} className="mx-auto text-[#D1D5DB]" />
              <p className="text-xs font-bold text-[#0F172A]">No matching transactions</p>
              <p className="text-[11px] text-[#6B7280]">
                Your deposit, withdrawal, and gameplay transactions will show here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E5E7EB] flex items-center justify-between hover:border-[#D1D5DB] transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        tx.type === 'credit'
                          ? 'bg-[#0EA5E9]/20 text-[#0F172A]'
                          : 'bg-[#737373]/15 text-[#737373]'
                      }`}
                    >
                      {tx.type === 'credit' ? (
                        <ArrowDownRight size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-[#0F172A] truncate max-w-[160px]">
                        {sanitizeText(tx.title)}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                        <span className="font-mono text-[#6B7280]">#{sanitizeText(tx.id)}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{sanitizeText(tx.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-black text-sm ${
                        tx.type === 'credit' ? 'text-[#737373]' : 'text-[#A3A3A3]'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </span>
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'completed'
                          ? 'text-[#16A34A]'
                          : tx.status === 'pending'
                          ? 'text-[#9CA3AF]'
                          : 'text-[#EF4444]'
                      }`}
                    >
                      {sanitizeText(tx.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawal History - live from /wallet/withdrawals */}
      {withdrawals.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm">Withdrawal History</h3>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] text-xs">
                <span className="font-mono">{w.id.slice(0, 8)}</span>
                <span className="font-bold">₹{w.amount.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${w.status === 'completed' ? 'bg-[#16A34A]/20 text-[#16A34A]' : 'bg-[#0EA5E9]/20 text-[#0F172A]'}`}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};