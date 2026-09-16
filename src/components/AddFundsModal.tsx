import React, { useState, useCallback } from 'react';
import { X, Plus, CheckCircle2, Wallet, ArrowUpRight } from 'lucide-react';
import { useToast } from './Toast';
import { useRateLimit } from '../hooks/useRateLimit';
import { validateAmount } from '../lib/validation';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFunds: (amount: number) => Promise<boolean>;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  onAddFunds,
}) => {
  const { showToast } = useToast();
  const depositRateLimit = useRateLimit({ maxCalls: 5, windowMs: 60000, key: 'addfunds_modal' });

  const [amount, setAmount] = useState<number>(500);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickPacks = [100, 500, 1000, 2000, 5000];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!depositRateLimit.checkLimit()) {
        setError('Too many attempts. Please wait a minute.');
        showToast('error', 'Too many attempts. Please wait.', 5000);
        return;
      }

      const validation = validateAmount(amount, 10, 100000);
      if (!validation.valid) {
        setError(validation.error || 'Invalid amount');
        showToast('error', validation.error || 'Invalid amount');
        return;
      }

      setError('');
      setIsSubmitting(true);

      const ok = await onAddFunds(validation.value);
      setIsSubmitting(false);
      if (!ok) {
        setError('Deposit failed. Please try again.');
        return;
      }

      setSuccess(true);
      showToast('success', `₹${validation.value.toFixed(2)} added to your wallet!`);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    },
    [amount, depositRateLimit, onAddFunds, onClose, showToast]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm bg-white border border-[#E5E7EB] rounded-3xl p-4 sm:p-5 text-[#0F172A] shadow-2xl">
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F8FAFC] text-[#6B7280] hover:text-[#0F172A] disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 size={48} className="text-[#16A34A] animate-bounce" />
            <h3 className="text-xl font-bold text-[#0F172A]">Funds Added Successfully!</h3>
            <p className="text-xs text-[#6B7280]">
              ₹{amount} added to your SatMat wallet.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/60 text-[#EF4444] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
              <div className="p-2 bg-[#0EA5E9] text-[#0F172A] rounded-xl">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Add Funds</h3>
                <p className="text-xs text-[#6B7280]">Instant Deposit to Wallet</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                Enter Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value.replace(/[^0-9]/g, '')));
                  setAmount(val);
                  setError('');
                }}
                min={10}
                max={100000}
                required
                disabled={isSubmitting}
                className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xl font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 mt-2">
                {quickPacks.map((pack) => (
                  <button
                    key={pack}
                    type="button"
                    onClick={() => {
                      setAmount(pack);
                      setError('');
                    }}
                    disabled={isSubmitting}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-bold bg-[#F8FAFC] hover:bg-[#E5E7EB] text-[#0F172A] border border-[#D1D5DB] rounded-xl disabled:opacity-50 whitespace-nowrap"
                  >
                    ₹{pack}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E5E7EB] space-y-2">
              <span className="text-[11px] font-semibold text-[#0F172A] block">
                Select Payment Method
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9] text-[#0F172A] font-semibold flex items-center justify-between">
                  <span>UPI / GPay / PhonePe</span>
                  <ArrowUpRight size={14} className="text-[#0F172A]" />
                </div>
                <div className="p-2 rounded-xl bg-white border border-[#D1D5DB] text-[#6B7280] flex items-center justify-between">
                  <span>Net Banking</span>
                  <ArrowUpRight size={14} className="text-[#9CA3AF]" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base shadow-lg shadow-[#2563EB]/20 active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              <span>{isSubmitting ? 'Processing...' : `Proceed to Add ₹${amount}`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
