import React, { useState, useCallback, useEffect } from 'react';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AppRoute } from '../types';
import { useToast } from '../components/Toast';
import { validatePhone, validatePassword } from '../lib/validation';
import { api } from '../lib/api';

interface LoginViewProps {
  onRouteChange: (route: AppRoute) => void;
  onLogin: (phone: string, password: string) => Promise<string | null>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onRouteChange,
  onLogin,
}) => {
  const { showToast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Warm backend as soon as login screen mounts — by the time user types credentials,
  // the Render instance is already hot (saves 8-12s on first auth attempt).
  useEffect(() => {
    api.warmUp();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Invalid phone');
        showToast('error', phoneValidation.error || 'Invalid phone number');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error || 'Invalid password');
        showToast('error', passwordValidation.error || 'Invalid password');
        return;
      }

      setPhoneError('');
      setPasswordError('');
      setIsLoading(true);

      const error = await onLogin(phoneValidation.sanitized, password);
      if (error) {
        setPhoneError(error);
        showToast('error', error);
        setIsLoading(false);
        return;
      }

      showToast('success', 'Welcome back!');
      onRouteChange('/');
      setIsLoading(false);
    },
    [phone, password, onLogin, onRouteChange, showToast]
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
            Welcome Back
          </h1>
          <p className="text-sm text-neutral-600 max-w-xs text-center leading-relaxed">
            Login to your SATMAT account
          </p>
        </div>

        {/* Card - lighter, blends with light background */}
        <div className="w-full bg-white rounded-3xl p-7 border border-black/[0.06] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.18),0_8px_20px_-8px_rgba(0,0,0,0.08)] relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent opacity-80" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="Enter phone number"
                  disabled={isLoading}
                  autoComplete="tel"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-11 pr-4 py-3.5 text-[15px] font-medium text-[#0F172A] placeholder:text-[#ADAFB8] focus:outline-none focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">{phoneError}</p>}
            </div>

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
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span>{isLoading ? 'Logging in...' : 'Login'}</span>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center bg-white/80 backdrop-blur-sm rounded-full px-5 py-2.5 border border-black/5 shadow-sm">
          <p className="text-sm text-neutral-700">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onRouteChange('/register')}
              className="text-[#075985] font-bold hover:underline hover:text-[#0EA5E9] transition-colors"
            >
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};