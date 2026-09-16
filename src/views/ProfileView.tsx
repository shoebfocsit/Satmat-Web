import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { Star, CheckCircle, Gift } from 'lucide-react';
import { useToast } from '../components/Toast';
import { validateName, validatePhone, sanitizeText } from '../lib/validation';
import { api } from '../lib/api';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (updated: Partial<User>) => Promise<boolean>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser }) => {
  const { showToast } = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [referralPhone, setReferralPhone] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const handleClaim = async () => {
    if (!referralPhone.trim()) { showToast('error', 'Enter invitee phone'); return; }
    setReferralLoading(true);
    try {
      const res = await api.claimReferral(referralPhone.trim());
      if (res.bonusCredited) showToast('success', `Bonus ₹${res.bonus} credited!`);
      else showToast('error', res.reason || 'Claim failed');
    } catch (e: any) { showToast('error', e?.message || 'Claim failed'); }
    finally { setReferralLoading(false); }
  };

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        setNameError(nameValidation.error || 'Invalid name');
        showToast('error', nameValidation.error || 'Invalid name');
        return;
      }

      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Invalid phone');
        showToast('error', phoneValidation.error || 'Invalid phone');
        return;
      }

      setNameError('');
      setPhoneError('');
      setIsSaving(true);

      const ok = await onUpdateUser({
        name: nameValidation.sanitized,
        phone: phoneValidation.sanitized,
      });
      setIsSaving(false);
      if (!ok) {
        setPhoneError('Could not save changes. Please try again.');
        return;
      }

      setSaved(true);
      showToast('success', 'Profile updated successfully!');
      setTimeout(() => setSaved(false), 2000);
    },
    [name, phone, onUpdateUser, showToast]
  );

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Profile Header Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 text-center shadow-sm relative overflow-hidden">
        <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#0EA5E9] bg-gradient-to-tr from-[#9CA3AF] to-[#D1D5DB] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
          {sanitizeText(user.name.charAt(0))}
        </div>

        <h2 className="text-xl font-bold text-[#0F172A] mt-3">{sanitizeText(user.name)}</h2>
        <span className="text-xs text-[#6B7280] font-mono">ID: {sanitizeText(user.id)}</span>

        {user.isGoldMember && (
          <div className="mt-2 inline-flex items-center gap-1 bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 px-3 py-1 rounded-full text-xs font-semibold text-[#0F172A]">
            <Star size={12} className="fill-[#0EA5E9]" />
            <span>VIP Gold Member</span>
          </div>
        )}
      </div>

      {/* Edit Form */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-4">
        {saved && (
          <div className="bg-[#16A34A]/10 p-2.5 rounded-2xl border border-[#16A34A] text-[#16A34A] text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <h3 className="font-bold text-sm text-[#0F172A]">Personal Information</h3>

        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2"><Gift size={14} /> Referral Bonus Claim</h4>
          <p className="text-xs text-[#6B7280]">Your code: <span className="font-mono font-bold text-[#0F172A]">{user.referralCode}</span></p>
          <div className="flex gap-2">
            <input value={referralPhone} onChange={(e) => setReferralPhone(e.target.value)} placeholder="Invitee phone" className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs" />
            <button onClick={handleClaim} disabled={referralLoading} className="px-4 py-2 rounded-xl bg-[#0EA5E9] text-[#0F172A] text-xs font-bold disabled:opacity-50">{referralLoading ? '...' : 'Claim'}</button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const val = sanitizeText(e.target.value, 50);
                setName(val);
                setNameError('');
              }}
              required
              disabled={isSaving}
              className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                setPhone(val);
                setPhoneError('');
              }}
              required
              disabled={isSaving}
              className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
            />
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-2xl bg-[#0EA5E9] text-[#0F172A] font-bold text-xs shadow-md shadow-[#2563EB]/20 active:scale-95 transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
