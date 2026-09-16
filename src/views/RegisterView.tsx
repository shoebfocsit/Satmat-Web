import React, { useState, useCallback, useEffect } from 'react';
import { User, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AppRoute } from '../types';
import { useToast } from '../components/Toast';
import { validateName, validatePhone, validatePassword, sanitizeText } from '../lib/validation';
import { api } from '../lib/api';

interface RegisterViewProps {
  onRouteChange: (route: AppRoute) => void;
  onRegister: (name: string, phone: string, password: string, referralCode?: string) => Promise<string | null>;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRouteChange,
  onRegister,
}) => {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [nameError, setNameError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const [termsError, setTermsError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.warmUp();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNameError('');
      setPhoneError('');
      setPasswordError('');
      setConfirmError('');
      setTermsError('');

      const nameValidation = validateName(fullName);
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

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error || 'Invalid password');
        showToast('error', passwordValidation.error || 'Invalid password');
        return;
      }

      if (password !== confirmPassword) {
        setConfirmError('Passwords do not match');
        showToast('error', 'Passwords do not match');
        return;
      }

      if (!agreedTerms) {
        setTermsError('You must agree to the Terms & Conditions');
        showToast('error', 'Please accept Terms & Conditions');
        return;
      }

      setIsLoading(true);

      const error = await onRegister(
        nameValidation.sanitized,
        phoneValidation.sanitized,
        password,
      );
      if (error) {
        setPhoneError(error);
        showToast('error', error);
        setIsLoading(false);
        return;
      }

      showToast('success', 'Account created successfully!');
      onRouteChange('/');
      setIsLoading(false);
    },
    [fullName, phone, password, confirmPassword, agreedTerms, onRegister, onRouteChange, showToast]
  );

  return (
    <div
      className="auth-page min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden"
      style={{
        backgroundImage: `url(/background.webp)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#F8FAFC',
      }}
    >
      {/* Light overlay to keep form readable while showing background artwork */}
      <div className="absolute inset-0 bg-white/68 backdrop-blur-[0.5px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-white/45 pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Header - clean typography, no logo/emoji */}
        <div className="flex flex-col items-center text-center mb-8 space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F0F0F]">
            Create Account
          </h1>
          <p className="text-sm text-neutral-600 max-w-xs text-center leading-relaxed">
            Join us and start your journey
          </p>
        </div>

        {/* Main Form - lighter, blends with light background */}
        <div className="w-full bg-white rounded-3xl p-7 border border-black/[0.06] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18),0_8px_20px_-8px_rgba(0,0,0,0.08)] relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent opacity-80" />
          
          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    const val = sanitizeText(e.target.value, 50);
                    setFullName(val);
                    setNameError('');
                  }}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                  autoComplete="name"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-11 pr-4 py-3.5 text-[15px] font-medium text-[#0F172A] placeholder:text-[#ADAFB8] focus:outline-none focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {nameError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{nameError}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-2 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                    setPhone(val);
                    setPhoneError('');
                  }}
                  placeholder="Phone Number"
                  disabled={isLoading}
                  autoComplete="tel"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-11 pr-4 py-3.5 text-[15px] font-medium text-[#0F172A] placeholder:text-[#ADAFB8] focus:outline-none focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{phoneError}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Create password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-11 pr-11 py-3.5 text-[15px] font-medium text-[#0F172A] placeholder:text-[#ADAFB8] focus:outline-none focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#0F172A] flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{passwordError}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError('');
                  }}
                  placeholder="Confirm password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-11 pr-11 py-3.5 text-[15px] font-medium text-[#0F172A] placeholder:text-[#ADAFB8] focus:outline-none focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#0F172A] flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{confirmError}</p>}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => {
                  setAgreedTerms(e.target.checked);
                  setTermsError('');
                }}
                disabled={isLoading}
                className="mt-1 w-4 h-4 accent-[#0EA5E9] rounded border-[#D1D5DB] bg-white cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-[#0EA5E9] focus:ring-offset-2 focus:ring-offset-white"
              />
              <label htmlFor="terms" className="text-xs text-neutral-600 cursor-pointer leading-relaxed">
                I agree to the <span className="text-[#075985] underline decoration-[#0EA5E9]/30 hover:text-[#0F172A] hover:decoration-[#0EA5E9]">Terms & Conditions</span>
              </label>
            </div>
            {termsError && <p className="text-xs text-red-500 ml-7 flex items-center gap-1">{termsError}</p>}

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none mt-2"
            >
              <span>{isLoading ? 'Creating Account...' : 'Register'}</span>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        {/* Bottom Link */}
        <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-full px-5 py-2.5 border border-black/5 shadow-sm">
          <p className="text-sm text-neutral-700">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onRouteChange('/login')}
              className="text-[#075985] font-bold hover:underline hover:text-[#0EA5E9] transition-colors"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};