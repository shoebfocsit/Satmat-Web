'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as any);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    const onVisibility = () => {
      if (isStandalone()) setStandalone(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any);
      window.removeEventListener('appinstalled', onInstalled);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'installed' | 'dismissed' | 'unavailable' | 'ios'> => {
    if (isStandalone()) return 'installed';
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return choice.outcome === 'accepted' ? 'installed' : 'dismissed';
      } catch {
        return 'unavailable';
      }
    }
    if (isIOS) return 'ios';
    return 'unavailable';
  }, [deferredPrompt, isIOS]);

  return {
    canInstall: !!deferredPrompt,
    isIOS,
    isStandalone: standalone,
    deferredPrompt,
    promptInstall,
  };
}
