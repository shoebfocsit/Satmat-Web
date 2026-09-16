'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'satmat-pwa-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

interface PWAInstallPromptProps {
  /** Current route — when '/login' the popup shows every time (not 7-day snooze). */
  currentRoute?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ currentRoute }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const isLogin = currentRoute === '/login';

  // Dismiss handling:
  // - At login: dismiss is session-only (cleared on next login navigation)
  // - Elsewhere: dismiss persists (so we don't spam on every page)
  const wasDismissed = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      // At login we ignore the stored dismiss — should show every login
      if (isLogin) return false;
      const ts = Number(raw);
      return Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [isLogin]);

  // Show logic — login always shows after short delay if not standalone
  useEffect(() => {
    if (isStandalone()) return;

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as any);

    const onAppInstalled = () => {
      setShowPopup(false);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
    };
    window.addEventListener('appinstalled', onAppInstalled);

    // At login: show after 800ms every time (if not standalone)
    // Elsewhere: show after 3s only if not recently dismissed
    const delay = isLogin ? 800 : 3000;
    const timer = setTimeout(() => {
      if (isStandalone()) return;
      if (!isLogin && wasDismissed()) return;
      setShowPopup(true);
    }, delay);

    const onVisibility = () => {
      if (isStandalone()) setShowPopup(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any);
      window.removeEventListener('appinstalled', onAppInstalled);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(timer);
    };
  }, [isLogin, wasDismissed]);

  // If deferredPrompt arrives later, ensure popup shows (respecting login rule)
  useEffect(() => {
    if (deferredPrompt && !isStandalone()) {
      if (!isLogin && wasDismissed()) return;
      setShowPopup(true);
    }
  }, [deferredPrompt, isLogin, wasDismissed]);

  // When navigating to login, re-show the popup even if previously dismissed
  useEffect(() => {
    if (isLogin && !isStandalone()) {
      const t = setTimeout(() => setShowPopup(true), 800);
      return () => clearTimeout(t);
    }
  }, [isLogin]);

  const handleDismiss = useCallback(() => {
    setShowPopup(false);
    // At login: dismiss is NOT persisted — next login will show again
    // Elsewhere: persist 7-day snooze
    if (!isLogin) {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    }
  }, [isLogin]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      handleDismiss();
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPopup(false);
        try {
          localStorage.removeItem(DISMISS_KEY);
        } catch {}
      } else {
        handleDismiss();
      }
    } catch {
      handleDismiss();
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, handleDismiss]);

  if (!showPopup || isStandalone()) return null;

  const canInstall = !!deferredPrompt;

  // At login: ALWAYS show popup when in browser (even if beforeinstallprompt hasn't fired)
  // Elsewhere: only show if canInstall or isIOS (to avoid spam on unsupported browsers)
  if (!isLogin && !canInstall && !isIOS) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={handleDismiss} />

      {/* Popup card */}
      <div className="relative pointer-events-auto w-full max-w-sm bg-white rounded-[20px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-black/5 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0EA5E9] via-[#14B8A6] to-[#0EA5E9]" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0EA5E9] flex items-center justify-center shadow-md shrink-0">
              <Smartphone size={22} className="text-[#0F172A]" />
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] transition shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <h3 className="mt-4 text-[18px] font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Download SATMAT App
          </h3>
          <p className="mt-1.5 text-sm text-[#6B7280] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Install karo aur fast, fullscreen experience paao. Offline bhi kaam karega!
          </p>

          {canInstall ? (
            <button
              onClick={handleInstall}
              className="mt-5 w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
            >
              <Download size={18} />
              Install App
            </button>
          ) : isIOS ? (
            <div className="mt-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px]">1</span>
                Tap <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-black/10"><span className="text-[10px]">⎙</span></span> Share
              </p>
              <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 mt-2">
                <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px]">2</span>
                Choose <b>Add to Home Screen</b>
              </p>
              <button onClick={handleDismiss} className="mt-3 w-full py-2.5 rounded-xl bg-[#0F172A] text-white font-bold text-xs">
                Samajh gaya
              </button>
            </div>
          ) : (
            <div className="mt-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#0F172A] text-center">
                Browser menu (⋮) me jao → <b>Add to Home Screen</b> / <b>Install App</b> par tap karo
              </p>
              <button onClick={handleDismiss} className="mt-3 w-full py-2.5 rounded-xl bg-[#0F172A] text-white font-bold text-xs">
                Samajh gaya
              </button>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">
            {canInstall ? 'One-tap install • No download from store needed' : 'Add to Home Screen from browser menu'}
          </p>
        </div>
      </div>
    </div>
  );
};
