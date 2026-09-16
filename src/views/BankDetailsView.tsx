import React, { useState, useCallback } from 'react';
import { BankDetails } from '../types';
import { Building2, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../components/Toast';
import { validateName, validateBankName, validateAccountNumber, validateIfsc, sanitizeText } from '../lib/validation';

interface BankDetailsViewProps {
  initialDetails?: BankDetails | null;
  onSaveBankDetails: (details: BankDetails) => Promise<boolean>;
}

export const BankDetailsView: React.FC<BankDetailsViewProps> = ({
  initialDetails = null,
  onSaveBankDetails,
}) => {
  const { showToast } = useToast();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(initialDetails);
  const [isEditing, setIsEditing] = useState<boolean>(!initialDetails);
  const [holder, setHolder] = useState(initialDetails?.accountHolder || '');
  const [bankName, setBankName] = useState(initialDetails?.bankName || '');
  const [accNum, setAccNum] = useState(initialDetails?.accountNumber || '');
  const [ifsc, setIfsc] = useState(initialDetails?.ifscCode || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [holderError, setHolderError] = useState<string>('');
  const [bankNameError, setBankNameError] = useState<string>('');
  const [accNumError, setAccNumError] = useState<string>('');
  const [ifscError, setIfscError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const holderValidation = validateName(holder);
      if (!holderValidation.valid) {
        setHolderError(holderValidation.error || 'Invalid name');
        return;
      }

      const bankNameValidation = validateBankName(bankName);
      if (!bankNameValidation.valid) {
        setBankNameError(bankNameValidation.error || 'Invalid bank name');
        return;
      }

      const accNumValidation = validateAccountNumber(accNum);
      if (!accNumValidation.valid) {
        setAccNumError(accNumValidation.error || 'Invalid account number');
        return;
      }

      const ifscValidation = validateIfsc(ifsc);
      if (!ifscValidation.valid) {
        setIfscError(ifscValidation.error || 'Invalid IFSC');
        return;
      }

      setHolderError('');
      setBankNameError('');
      setAccNumError('');
      setIfscError('');
      setIsSaving(true);

      const newDetails: BankDetails = {
        accountHolder: holderValidation.sanitized,
        bankName: bankNameValidation.sanitized,
        accountNumber: accNumValidation.sanitized,
        ifscCode: ifscValidation.sanitized,
      };

      const ok = await onSaveBankDetails(newDetails);
      setIsSaving(false);
      if (!ok) {
        setHolderError('Could not save bank details. Please try again.');
        return;
      }

      setBankDetails(newDetails);
      setIsEditing(false);
      setSavedSuccess(true);
      showToast('success', 'Bank details saved securely!');
      setTimeout(() => setSavedSuccess(false), 2000);
    },
    [holder, bankName, accNum, ifsc, onSaveBankDetails, showToast]
  );

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      <div className="bg-[#E5E7EB] p-3 rounded-2xl border border-[#D1D5DB] text-center">
        <h2 className="font-bold text-base text-[#0F172A]">Bank Details</h2>
        <p className="text-xs text-[#6B7280]">
          Required for instant direct withdrawal payouts
        </p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-sm text-center space-y-4">
        {savedSuccess && (
          <div className="bg-[#16A34A]/10 p-3 rounded-2xl border border-[#16A34A] text-[#16A34A] text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            <span>Bank details saved securely!</span>
          </div>
        )}

        {!isEditing && bankDetails ? (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
              <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#0F172A]">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">
                  {sanitizeText(bankDetails.bankName)}
                </h3>
                <span className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={12} className="text-[#16A34A]" />
                  Verified Payout Account
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#6B7280] block text-[10px] uppercase font-semibold">
                  Account Holder
                </span>
                <span className="font-bold text-[#0F172A] text-sm">
                  {sanitizeText(bankDetails.accountHolder)}
                </span>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[10px] uppercase font-semibold">
                  Account Number
                </span>
                <span className="font-mono font-bold text-[#0F172A] text-sm">
                  •••• {bankDetails.accountNumber.slice(-4)}
                </span>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[10px] uppercase font-semibold">
                  IFSC Code
                </span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {sanitizeText(bankDetails.ifscCode)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] text-[#0F172A] font-bold text-xs hover:bg-[#E5E7EB] transition"
            >
              Edit Bank Details
            </button>
          </div>
        ) : isEditing ? (
          <form onSubmit={handleSubmit} className="text-left space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={holder}
                onChange={(e) => {
                  const val = sanitizeText(e.target.value, 100);
                  setHolder(val);
                  setHolderError('');
                }}
                placeholder="Enter account holder name"
                required
                disabled={isSaving}
                className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
              />
              {holderError && <p className="text-xs text-red-500 mt-1">{holderError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => {
                  const val = sanitizeText(e.target.value, 100);
                  setBankName(val);
                  setBankNameError('');
                }}
                placeholder="e.g. State Bank of India"
                required
                disabled={isSaving}
                className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
              />
              {bankNameError && <p className="text-xs text-red-500 mt-1">{bankNameError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={accNum}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 20);
                  setAccNum(val);
                  setAccNumError('');
                }}
                placeholder="Enter bank account number"
                required
                disabled={isSaving}
                className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
              />
              {accNumError && <p className="text-xs text-red-500 mt-1">{accNumError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                  setIfsc(val);
                  setIfscError('');
                }}
                placeholder="e.g. SBIN0001234"
                required
                disabled={isSaving}
                className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] uppercase focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
              />
              {ifscError && <p className="text-xs text-red-500 mt-1">{ifscError}</p>}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-2 py-3 rounded-2xl bg-[#0EA5E9] text-[#0F172A] font-bold text-xs shadow-md shadow-[#2563EB]/20 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Bank Details'}
            </button>
          </form>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#F8FAFC] border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF]">
              <Building2 size={36} />
            </div>

            <h3 className="text-lg font-bold text-[#0F172A]">No Bank Details Found</h3>

            <button
              onClick={() => setIsEditing(true)}
              className="py-3 px-6 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#2563EB]/20 active:scale-95 transition"
            >
              <Plus size={16} />
              <span>Add Bank Details</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
