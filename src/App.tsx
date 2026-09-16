/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import React, { useState, Suspense, lazy, useCallback, useEffect } from 'react';
import {
  User,
  Market,
  MarketGameType,
  Transaction,
  Bid,
  BankDetails,
  AppRoute,
  Notice,
  GameRate,
  LuckyNumber,
} from './types';
// Live API is the single source of truth. No mock/sample data is used anywhere
// in this app — Results & Charts come straight from the backend.

// API
import { LIVE_POLL_MS, isTabVisible } from './lib/live';
import {
  api,
  ApiError,
  ApiBid,
  ApiTransaction,
  ApiUser,
  AuthResponse,
  bidErrorMessage,
  setTokens,
  getRefreshToken,
  getAccessToken,
  clearTokens,
  hasTokens,
  isTokenExpired,
} from './lib/api';

// Components
import { BackgroundDecoration } from './components/BackgroundDecoration';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SideDrawer } from './components/SideDrawer';
import { ReferModal } from './components/ReferModal';
import { BiddingModal } from './components/BiddingModal';
import { AddFundsModal } from './components/AddFundsModal';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// Views - Dynamic imports for code splitting
const RegisterView = lazy(() => import('./views/RegisterView').then((m) => ({ default: m.RegisterView })));
const LoginView = lazy(() => import('./views/LoginView').then((m) => ({ default: m.LoginView })));
const HomeView = lazy(() => import('./views/HomeView').then((m) => ({ default: m.HomeView })));
const MarketSelectionView = lazy(() => import('./views/MarketSelectionView').then((m) => ({ default: m.MarketSelectionView })));
const ChartHistoryView = lazy(() => import('./views/ChartHistoryView').then((m) => ({ default: m.ChartHistoryView })));
const WalletView = lazy(() => import('./views/WalletView').then((m) => ({ default: m.WalletView })));
const WinningsView = lazy(() => import('./views/WinningsView').then((m) => ({ default: m.WinningsView })));
const ContactView = lazy(() => import('./views/ContactView').then((m) => ({ default: m.ContactView })));
const BidsView = lazy(() => import('./views/BidsView').then((m) => ({ default: m.BidsView })));
const FinanceView = lazy(() => import('./views/FinanceView').then((m) => ({ default: m.FinanceView })));
const NoticeBoardView = lazy(() => import('./views/NoticeBoardView').then((m) => ({ default: m.NoticeBoardView })));
const GameRatesView = lazy(() => import('./views/GameRatesView').then((m) => ({ default: m.GameRatesView })));
const BankDetailsView = lazy(() => import('./views/BankDetailsView').then((m) => ({ default: m.BankDetailsView })));
const HowToPlayView = lazy(() => import('./views/HowToPlayView').then((m) => ({ default: m.HowToPlayView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const OrderRecordView = lazy(() => import('./views/OrderRecordView').then((m) => ({ default: m.OrderRecordView })));
const ResultsView = lazy(() => import('./views/ResultsView').then((m) => ({ default: m.ResultsView })));
const ChartsView = lazy(() => import('./views/ChartsView').then((m) => ({ default: m.ChartsView })));
const ScheduleView = lazy(() => import('./views/ScheduleView').then((m) => ({ default: m.ScheduleView })));

const LoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
  </div>
);

const USER_CACHE_KEY = 'satmat_user';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const idemKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const mapUser = (u: ApiUser): User => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  balance: u.balance,
  isGoldMember: u.isGoldMember,
  referralCode: u.referralCode,
  roles: u.roles,
});

const mapTransaction = (t: ApiTransaction): Transaction => ({
  id: t.id,
  type: t.type === 'debit' ? 'debit' : 'credit',
  amount: t.amount,
  title: t.title,
  date: formatDate(t.date),
  status: t.status,
});

interface WinningItem {
  id: string;
  marketName: string;
  gameType: string;
  number: string;
  amount: number;
  wonAmount: number;
  date: string;
}

const mapWinningItem = (w: any): WinningItem => ({
  id: w.id,
  marketName: w.marketName,
  gameType: w.gameType,
  number: w.number,
  amount: w.amount,
  wonAmount: w.wonAmount,
  date: formatDate(w.date),
});

/**
 * Derive the Jodi / Panel pills from a live market result string in the
 * canonical "open-jodi-close" format (e.g. "116-60-460"):
 *   - Jodi  = the 2-digit middle number → "60"
 *   - Panel = the 3-digit open panna → "116"
 * This matches the definition used by the Results screen and the Charts
 * tables so every surface shows the exact same live numbers for a market.
 */
const deriveResult = (result: string): { jodi: string; panel: string; openDeclared: boolean; closeDeclared: boolean } => {
  const none = { jodi: '--', panel: '---', openDeclared: false, closeDeclared: false };
  if (typeof result !== 'string' || !result) return none;
  // Canonical "open-jodi-close" incl. partial "116-**-***" (open declared, close pending)
  const parts = result.split('-');
  if (parts.length === 3) {
    const [open, jodi, close] = parts;
    const openOk = /^\d{3}$/.test(open);
    const jodiOk = /^\d{2}$/.test(jodi);
    const closeOk = /^\d{3}$/.test(close);
    if (!openOk && !jodiOk && !closeOk) return none;
    return {
      jodi: jodiOk ? jodi : '--',
      panel: openOk ? open : '---',
      openDeclared: openOk,
      closeDeclared: closeOk,
    };
  }
  if (result !== '***-**-***') return { jodi: result, panel: result, openDeclared: true, closeDeclared: true };
  return none;
};

const mapMarket = (m: Market): Market => {
  const { jodi, panel } = deriveResult(m.result);
  return { ...m, jodi, panel };
};

const cacheUser = (user: User) => {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
};

const cachedUser = (): User | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const clearCachedUser = () => {
  try {
    if (typeof window !== 'undefined') localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // ignore
  }
};

// Render free-tier sleeps when idle — the first request wakes it and the
// proxy can answer 500/timeout before boot finishes. Auth calls are safe to
// retry once (phone is unique server-side, so a lost response can't create
// a duplicate account).
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isColdStartError = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504 || e.status === 500);

// Ping the backend until it answers (cold-start wake-up ladder). Optimized for speed:
// - Shorter ping timeout (4s) + faster backoff (1s,2s) = max ~11s vs old ~36s.
// - 2 attempts instead of 3 — if still down after 2, show "waking up" message immediately.
const wakeBackend = async (): Promise<boolean> => {
  for (let i = 0; i < 2; i++) {
    try {
      await api.ping(4000);
      return true;
    } catch {
      await sleep(i === 0 ? 1000 : 2000);
    }
  }
  return false;
};

// Proactive warm-up: called on mount and on Login/Register view mount so the
// backend is hot before the user even submits. Fire-and-forget, never blocks UI.
const warmBackend = () => {
  api.warmUp();
};

const errorMessage = (e: unknown): string => {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message || 'Something went wrong. Please try again.';
  if (e instanceof Event) {
    const t = (e.target as any)?.error?.message || (e as any).reason || (e as any).message || e.type;
    return typeof t === 'string' && t && t !== '[object Event]' ? t : 'Something went wrong. Please try again.';
  }
  if (typeof e === 'string') return e;
  try {
    const s = String(e);
    if (s && s !== '[object Event]' && s !== '[object Object]') return s;
  } catch {}
  return 'Something went wrong. Please try again.';
};

function AppShell() {
  const { showToast } = useToast();

  // Proactive backend warm-up on every app load — Render free tier sleeps after 15min idle.
  // Firing immediately in background means the backend is already booting while the user
  // reads the login form, so the first auth request is ~2-3s instead of 12-15s.
  useEffect(() => {
    warmBackend();
    // Keep warm while the tab is open and user hasn't logged in yet — every 4min
    // is enough to stay inside Render's 15min sleep window without spamming.
    const id = setInterval(() => warmBackend(), 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // App-config & server-time: fetch once for banners, force-update and clock skew correction
  useEffect(() => {
    api.appConfig().catch(() => {});
    api.serverTime().catch(() => {});
  }, []);

  // Continuous live refresh: silent re-fetch every LIVE_POLL_MS while the tab
  // is visible so declares land on cards moments after release. Paused when
  // hidden (no background spam, no stale painting). Silent (no toast) on
  // failure. Only lightweight signals ride this tick — heavy chart ranges
  // refetch on change-detection inside their own screens (see lib/live.ts).
  // Also poll notifications for authenticated users.
  useEffect(() => {
    const tick = () => {
      if (!isTabVisible()) return;
      api.markets().then((list) => {
        setMarkets(list.map(mapMarket));
      }).catch(() => {});
      api.luckyNumber().then((lucky) => {
        setLucky(lucky);
      }).catch(() => {});
      if (hasTokens()) {
        api.notifications({ page: 1, limit: 5 }).catch(() => {});
      }
    };
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Global handling for stray Event rejections that Next would render as "[object Event]"
  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const r: any = ev.reason;
      if (r instanceof Event || String(r) === '[object Event]') {
        ev.preventDefault();
        // eslint-disable-next-line no-console
        console.error('[unhandledrejection] normalized Event:', r);
        showToast('error', 'Something went wrong. Please try again.');
      }
    };
    const onError = (ev: ErrorEvent) => {
      if (ev.message === '[object Event]' || String(ev.error) === '[object Event]') {
        ev.preventDefault();
        // eslint-disable-next-line no-console
        console.error('[error] normalized Event:', ev);
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('error', onError);
    };
  }, [showToast]);

  // App state
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('/');
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // LIVE-ONLY: always start empty and fetch fresh — never paint stored snapshots.
  const [markets, setMarkets] = useState<Market[]>([]);
  const [gameTypes, setGameTypes] = useState<MarketGameType[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [gameRates, setGameRates] = useState<GameRate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [lucky, setLucky] = useState<LuckyNumber | null>(null);
  const [winnings, setWinnings] = useState<{ totalWinnings: number; winningCount: number; items: WinningItem[] }>({
    totalWinnings: 0,
    winningCount: 0,
    items: [],
  });

  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<MarketGameType | null>(null);
  const [chartFocus, setChartFocus] = useState<'jodi' | 'panel' | null>(null);

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isReferModalOpen, setIsReferModalOpen] = useState<boolean>(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState<boolean>(false);
  const [isBiddingModalOpen, setIsBiddingModalOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const handleRouteChange = useCallback((route: AppRoute) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ---- Data loading ----

  const isNetworkError = useCallback((e: unknown): boolean => {
    if (e instanceof ApiError) {
      // 401/403/404 are auth/validation, not offline. 5xx and network are offline.
      return e.status >= 500 || e.status === 0;
    }
    if (e instanceof Error) {
      const msg = e.message.toLowerCase();
      return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('abort') || msg.includes('timeout');
    }
    return false;
  }, []);

  const loadMarkets = useCallback(async (force = false): Promise<Market[]> => {
    try {
      const list = await api.markets(force);
      const mapped = list.map(mapMarket);
      setMarkets(mapped);
      if (mapped.length > 0) {
        setSelectedMarket((prev) => prev ?? mapped.find((m) => m.highlight) ?? mapped[0] ?? null);
      } else {
        setSelectedMarket((prev) => prev ?? null);
      }
      // Don't clear isOffline here; let loadAll decide based on aggregated status
      return mapped;
    } catch (err) {
      setMarkets([]);
      setSelectedMarket((prev) => prev ?? null);
      if (isNetworkError(err)) {
        setIsOffline(true);
        showToast('error', errorMessage(err) || 'Failed to load markets. Please retry.');
      }
      return [];
    }
  }, [showToast, isNetworkError]);

  const refreshWallet = useCallback(async () => {
    try {
      const w = await api.wallet();
      setUser((prev) => (prev ? { ...prev, balance: w.balance } : prev));
      return true;
    } catch {
      return false;
    }
  }, []);

  const mapBid = useCallback(
    (b: ApiBid, marketsList: Market[]): Bid => {
      const market = marketsList.find((m) => m.id === b.marketId);
      const status: Bid['status'] =
        b.status === 'won'
          ? 'won'
          : b.status === 'pending'
            ? 'pending'
            : b.status === 'cancelled'
              ? 'cancelled'
              : 'lost';
      return {
        id: b.id,
        marketName: market?.name ?? b.marketId,
        gameType: b.gameType,
        numberSelected: b.number,
        amount: b.amount,
        status,
        date: formatDate(b.date),
      };
    },
    [],
  );

  // ---- Per-screen lazy loaders ----
  // These auth-required endpoints are fetched only when their screen/feature is
  // opened, never eagerly on boot/login (see loadAll).
  const loadWalletBalance = useCallback(async () => {
    try {
      const w = await api.wallet();
      setUser((prev) => (prev ? { ...prev, balance: w.balance } : prev));
    } catch {
      // balance stays as-is; header tolerates a stale value
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const page = await api.transactions();
      setTransactions(page.items.map(mapTransaction));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      setTransactions([]);
    }
  }, []);

  const loadBids = useCallback(async () => {
    try {
      const page = await api.bids();
      setBids(page.items.map((b) => mapBid(b, markets)));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      setBids([]);
    }
  }, [mapBid, markets]);

  const loadBankDetails = useCallback(async () => {
    try {
      const bank = await api.bankDetails();
      setBankDetails(bank);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      setBankDetails(null);
    }
  }, []);

  const loadReferral = useCallback(async () => {
    try {
      const ref = await api.referral();
      setReferralCode(ref.code);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      setReferralCode('');
    }
  }, []);

  const loadWinnings = useCallback(async () => {
    try {
      const win = await api.winnings();
      setWinnings({
        totalWinnings: win.totalWinnings,
        winningCount: win.winningCount,
        items: win.items.map(mapWinningItem),
      });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      setWinnings({ totalWinnings: 0, winningCount: 0, items: [] });
    }
  }, []);

  const loadAll = useCallback(async (isAuthed = false): Promise<void> => {
    let offline = false;
    const markOfflineIfNetwork = (e: unknown) => {
      if (isNetworkError(e)) offline = true;
    };

    // Public data — fetch in parallel to avoid 4×5s sequential waterfall
    const [marketsRes, noticesRes, gameRatesRes, luckyRes] = await Promise.allSettled([
      loadMarkets(),
      api.notices(),
      api.gameRates(),
      api.luckyNumber(),
    ]);

    if (marketsRes.status === 'rejected') {
      markOfflineIfNetwork((marketsRes as PromiseRejectedResult).reason);
    }
    if (luckyRes.status === 'fulfilled') setLucky(luckyRes.value);
    else {
      setLucky(null);
      markOfflineIfNetwork(luckyRes.reason);
    }
    if (noticesRes.status === 'fulfilled') setNotices(noticesRes.value);
    else {
      setNotices([]);
      markOfflineIfNetwork(noticesRes.reason);
    }
    if (gameRatesRes.status === 'fulfilled') setGameRates(gameRatesRes.value);
    else {
      setGameRates([]);
      markOfflineIfNetwork(gameRatesRes.reason);
    }

    // Auth-required: only the wallet balance is needed globally (header). All
    // other auth data (transactions, bids, bank-details, referral, winnings) is
    // lazy-loaded per screen so we do not call endpoints the user never visits.
    if (isAuthed) {
      try {
        await loadWalletBalance();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
        markOfflineIfNetwork(e);
      }
    }

    setIsOffline(offline);
  }, [loadMarkets, mapBid, isNetworkError, loadWalletBalance]);

  // Lazy-load per screen: fetch each auth-required endpoint only when its screen
  // is opened, so we never call endpoints the user does not visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const r = currentRoute;
    if (r === '/bids' || r === '/orders') loadBids().catch(() => undefined);
    else if (r === '/passbook' || r === '/finance' || r === '/wallet') {
      loadTransactions().catch(() => undefined);
    } else if (r === '/winnings') loadWinnings().catch(() => undefined);
    else if (r === '/bank-details') loadBankDetails().catch(() => undefined);
    else if (r === '/profile') loadReferral().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoute]);

  // Load the selected market's game types (Jodi, Panna, Sangam, …) so the
  // Play Now screen always reflects the correct, market-specific buttons.
  useEffect(() => {
    if (!selectedMarket) {
      setGameTypes([]);
      return;
    }
    let cancelled = false;
    api
      .gameTypes(selectedMarket.id)
      .then((gts) => {
        if (!cancelled) setGameTypes(gts);
      })
      .catch(() => {
        if (!cancelled) setGameTypes([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket?.id]);

  // ---- Auth lifecycle ----
  // Use a ref to ensure boot runs only once even if React StrictMode
  // mounts/remounts or if loadAll identity changes due to state updates.
  const hasBootedRef = React.useRef(false);
  const loadAllRef = React.useRef(loadAll);
  React.useEffect(() => { loadAllRef.current = loadAll; }, [loadAll]);

  useEffect(() => {
    if (hasBootedRef.current) return;
    hasBootedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!hasTokens()) {
        setUser(null);
        setCurrentRoute('/login');
        setIsBooting(false);
        return;
      }
      // If both tokens are expired, skip network call and go straight to login (avoids 401 console spam)
      const access = getAccessToken();
      const refresh = getRefreshToken();
      if (isTokenExpired(access) && isTokenExpired(refresh)) {
        clearTokens();
        clearCachedUser();
        setUser(null);
        setCurrentRoute('/login');
        setIsBooting(false);
        return;
      }
      // If access is expired but refresh is still valid, proactively refresh to avoid a 401 on /auth/me
      if (isTokenExpired(access) && !isTokenExpired(refresh)) {
        const ok = await (api as any).silentRefresh?.();
        if (!ok) {
          clearTokens();
          clearCachedUser();
          setUser(null);
          setCurrentRoute('/login');
          setIsBooting(false);
          return;
        }
      }

      // Render the last-known session immediately so the shell appears while we
      // revalidate with the backend. This removes a multi-second blank spinner on
      // cold backend starts; stale balance/markets are refreshed in the background.
      if (!cancelled) {
        const cached = cachedUser();
        if (cached) {
          setUser(cached);
          setCurrentRoute('/');
          setIsBooting(false);
        }
      }

    // Session check + full data load CONCURRENTLY (was sequential me() → loadAll:
    // a whole extra RTT + backend processing on every app open).
    const bootOnce = async () => {
      const [me] = await Promise.all([api.me(), loadAllRef.current(true)]);
      return me;
    };
    const establish = (me: ApiUser | null) => {
      if (cancelled) return;
      if (!me) {
        // 401/403 handled inside api.me() → null (no valid session)
        clearTokens();
        clearCachedUser();
        setUser(null);
        setCurrentRoute('/login');
        return;
      }
      const mapped = mapUser(me);
      setUser(mapped);
      cacheUser(mapped);
      setCurrentRoute('/');
    };

    try {
      let me: ApiUser | null;
      try {
        me = await bootOnce();
      } catch (e) {
        // Cold backend on first touch (timeout/5xx): wake it once (~11s) and
        // retry once instead of instantly falling back to an empty shell.
        // Previously boot had ZERO retries — one slow wake = blank app.
        if (!cancelled && isColdStartError(e) && (await wakeBackend().catch(() => false))) {
          if (cancelled) return;
          me = await bootOnce();
        } else {
          throw e;
        }
      }
      establish(me);
    } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearTokens();
          clearCachedUser();
          setUser(null);
          setCurrentRoute('/login');
        } else {
          // Backend unreachable — fall back to the cached session but DO NOT
          // inject mock markets/notices. Live data remains empty until reachable.
          // Do NOT spam retries: this block runs once; further retries are manual via UI "Retry" button.
          const cached = cachedUser();
          if (cached) {
            setUser(cached);
            setMarkets([]);
            setGameTypes([]);
            setNotices([]);
            setGameRates([]);
            setIsOffline(true);
            setCurrentRoute('/');
          } else {
            clearTokens();
            setUser(null);
            setCurrentRoute('/login');
          }
        }
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const establishSession = useCallback(
    (res: AuthResponse) => {
      setTokens(res.accessToken, res.refreshToken);
      const mapped = mapUser(res.user);
      setUser(mapped);
      cacheUser(mapped);
      // Navigate immediately so auth feels instant. Load data in the
      // background rather than blocking navigation on several network
      // round-trips (which previously could push past the 15s timeout).
      setCurrentRoute('/');
      void loadAll(true).catch(() => undefined);
    },
    [loadAll],
  );

  const handleLogin = useCallback(
    async (phone: string, password: string): Promise<string | null> => {
      try {
        establishSession(await api.login(phone, password));
        return null;
      } catch (e) {
        if (!isColdStartError(e)) return errorMessage(e);
        // Backend may be cold-starting: wake it, then retry once.
        if (!(await wakeBackend())) {
          return 'Server is waking up. Please wait a few seconds and try again.';
        }
        try {
          establishSession(await api.login(phone, password));
          return null;
        } catch (e2) {
          return errorMessage(e2);
        }
      }
    },
    [establishSession],
  );

  const handleRegister = useCallback(
    async (name: string, phone: string, password: string, referralCodeArg?: string): Promise<string | null> => {
      const payload = {
        name,
        phone,
        password,
        referralCode: referralCodeArg || undefined,
      };
      try {
        establishSession(await api.register(payload));
        return null;
      } catch (e) {
        if (!isColdStartError(e)) return errorMessage(e);
        // Backend may be cold-starting: wake it, then retry once. If the
        // first attempt actually succeeded server-side (response lost), the
        // retry returns PHONE_EXISTS — then just log in with the same
        // credentials.
        if (!(await wakeBackend())) {
          return 'Server is waking up. Please wait a few seconds and try again.';
        }
        try {
          establishSession(await api.register(payload));
          return null;
        } catch (e2) {
          if (e2 instanceof ApiError && e2.code === 'PHONE_EXISTS') {
            try {
              establishSession(await api.login(phone, password));
              return null;
            } catch {
              return 'Account already exists. Please log in.';
            }
          }
          return errorMessage(e2);
        }
      }
    },
    [establishSession],
  );

  const handleLogout = useCallback(() => {
    const refresh = getRefreshToken();
    if (refresh) {
      api.logout(refresh).catch(() => undefined);
    }
    clearTokens();
    clearCachedUser();
    setUser(null);
    setBids([]);
    setTransactions([]);
    setBankDetails(null);
    setCurrentRoute('/login');
    showToast('success', 'Logged out successfully.');
  }, [showToast]);

  const handleRefresh = useCallback(async () => {
    // Force-fresh markets (bypass 20s cache) so the button never re-renders stale.
    await loadMarkets(true).catch(() => undefined);
    await loadAll(true);
    // Reload the current screen's lazy data too — header refresh must work everywhere.
    const r = currentRoute;
    try {
      if (r === '/bids' || r === '/orders') await loadBids();
      else if (r === '/passbook' || r === '/finance' || r === '/wallet') await loadTransactions();
      else if (r === '/winnings') await loadWinnings();
      else if (r === '/bank-details') await loadBankDetails();
      else if (r === '/profile') await loadReferral();
    } catch {
      // lazy loaders already swallow non-auth errors; auth errors surface via boot flow
    }
    // Self-fetching screens (Results / Charts / ChartHistory) listen for this
    // and force-reload their own data.
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('satmat:refresh'));
    showToast('success', 'Data refreshed');
  }, [loadAll, loadMarkets, loadBids, loadTransactions, loadWinnings, loadBankDetails, loadReferral, currentRoute, showToast]);

  // ---- Financial actions ----

  const handleAddFunds = useCallback(
    async (amount: number): Promise<boolean> => {
      try {
        const depositKey = idemKey();
        const order = await api.deposit(amount, depositKey);
        // With the mock provider the order verifies immediately. With a real
        // UPI gateway this step happens after the user pays via upiIntent.
        await api.verifyDeposit(order.orderId, `${depositKey}-verify`);
        await refreshWallet();
        try {
          const page = await api.transactions();
          setTransactions(page.items.map(mapTransaction));
        } catch {
          // keep existing list
        }
        return true;
      } catch (e) {
        showToast('error', bidErrorMessage(e));
        return false;
      }
    },
    [refreshWallet, showToast],
  );

  const handleWithdraw = useCallback(
    async (amount: number, payout: 'bank' | 'upi', upiId?: string): Promise<boolean> => {
      try {
        await api.withdraw(
          { amount, payout, upiId: payout === 'upi' ? upiId : undefined },
          idemKey(),
        );
        await refreshWallet();
        try {
          const page = await api.transactions();
          setTransactions(page.items.map(mapTransaction));
        } catch {
          // keep existing list
        }
        return true;
      } catch (e) {
        showToast('error', errorMessage(e));
        return false;
      }
    },
    [refreshWallet, showToast],
  );

  const handlePlaceBid = useCallback(
    async (bidData: {
      marketName: string;
      marketId: string;
      gameType: string;
      numberSelected: string;
      amount: number;
      leg: 'OPEN' | 'CLOSE';
    }): Promise<string | null> => {
      // null = success; string = user-friendly failure (server is the final
      // authority — a MARKET_CLOSED here overrides any OPEN shown in UI).
      try {
        await api.placeBulkBid(
          {
            marketId: bidData.marketId,
            gameType: bidData.gameType,
            round: bidData.leg,
            items: [{ number: bidData.numberSelected, amount: bidData.amount }],
          },
          idemKey(),
        );
        await refreshWallet();
        try {
          const page = await api.bids();
          setBids(page.items.map((b) => mapBid(b, markets)));
        } catch {
          // keep existing list
        }
        return null;
      } catch (e) {
        const msg = bidErrorMessage(e);
        showToast('error', msg);
        return msg;
      }
    },
    [mapBid, refreshWallet, showToast, markets],
  );

  const handleUpdateUser = useCallback(
    async (updated: Partial<User>): Promise<boolean> => {
      try {
        const apiUser = await api.updateMe({
          name: updated.name,
          phone: updated.phone,
        });
        const mapped = mapUser(apiUser);
        setUser(mapped);
        cacheUser(mapped);
        return true;
      } catch (e) {
        showToast('error', errorMessage(e));
        return false;
      }
    },
    [showToast],
  );

  const handleSaveBankDetails = useCallback(
    async (details: BankDetails): Promise<boolean> => {
      try {
        const saved = await api.saveBankDetails(details);
        setBankDetails(saved);
        return true;
      } catch (e) {
        showToast('error', errorMessage(e));
        return false;
      }
    },
    [showToast],
  );

  // ---- Header props ----

  const getHeaderProps = () => {
    switch (effectiveRoute) {
      case '/':
        return {
          title: 'SATMAT',
          showMobileMenu: true,
          showWallet: true,
          showNotification: true,
          showRefresh: true,
          balance: user?.balance ?? 0,
          onMenuClick: () => setIsDrawerOpen(true),
          onWalletClick: () => handleRouteChange('/wallet'),
          onNotificationClick: () => handleRouteChange('/notice-board'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/market':
        return {
          title: selectedMarket ? selectedMarket.name : 'SATMAT',
          subtitle: 'Select Market',
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/chart':
        return {
          title: 'Chart History',
          subtitle: selectedMarket ? selectedMarket.name : undefined,
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/results':
        return {
          title: 'Results',
          subtitle: "Today's results",
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/charts':
        return {
          title: 'Charts',
          subtitle: 'Date-range charts',
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/schedule':
        return {
          title: 'Full Schedule',
          subtitle: 'All markets • IST',
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/wallet':
        return {
          title: 'My Wallet',
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/winnings':
        return {
          title: 'Winnings',
          showBackButton: true,
          showNotification: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/contact':
        return {
          title: 'Contact & Support',
          subtitle: "We're here to help",
          showBackButton: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/bids':
        return {
          title: 'Bids',
          showBackButton: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/orders':
        return {
          title: 'Order Record',
          showBackButton: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/finance':
      case '/passbook':
        return {
          title: 'Finance',
          showBackButton: true,
          showRefresh: true,
          onBackClick: () => handleRouteChange('/'),
          onRefreshClick: () => handleRefresh(),
        };
      case '/notice-board':
        return {
          title: 'Notice Board',
          showBackButton: true,
          onBackClick: () => handleRouteChange('/'),
        };
      case '/game-rates':
        return {
          title: 'Game Rates',
          showBackButton: true,
          onBackClick: () => handleRouteChange('/'),
        };
      case '/bank-details':
        return {
          title: 'Bank Details',
          showBackButton: true,
          showEdit: true,
          onBackClick: () => handleRouteChange('/'),
        };
      case '/how-to-play':
        return {
          title: 'How to Play',
          showBackButton: true,
          onBackClick: () => handleRouteChange('/'),
        };
      case '/profile':
        return {
          title: 'My Profile',
          showBackButton: true,
          onBackClick: () => handleRouteChange('/'),
        };
      default:
        return {
          title: 'SatMat',
          showBackButton: true,
          onBackClick: () => handleRouteChange('/'),
        };
    }
  };

  // If not authenticated, only allow the auth screens (derived, no state writes during render).
  const isAuthRoute = currentRoute === '/register' || currentRoute === '/login';
  const effectiveRoute: AppRoute = user ? currentRoute : (isAuthRoute ? currentRoute : '/login');

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center">
        <BackgroundDecoration />
        <div className="w-10 h-10 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm font-semibold text-[#6B7280]">Loading SATMAT…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans relative selection:bg-[#0EA5E9] selection:text-[#0F172A]">
      {/* Background Pattern */}
      <BackgroundDecoration />

      {isOffline && (
        <div className="sticky top-0 z-40 bg-[#0EA5E9]/20 border-b border-[#0EA5E9] text-[#0F172A] text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2">
          <span>Offline — live data unavailable. Actions requiring server will be retried when online.</span>
          <button onClick={() => void loadAll()} className="underline font-black">Retry</button>
        </div>
      )}

      {/* Desktop Sidebar (hidden on register/login) */}
      {!isAuthRoute && (
        <Sidebar
          user={user as User}
          currentRoute={effectiveRoute}
          onRouteChange={handleRouteChange}
          onOpenReferModal={() => {
            loadReferral().catch(() => undefined);
            setIsReferModalOpen(true);
          }}
          onLogout={handleLogout}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        />
      )}

      {/* Main Content Column */}
      <div
        className={`flex-1 flex flex-col z-10 min-h-screen transition-all duration-300 ${
          !isAuthRoute ? (isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64') : ''
        }`}
      >
        {/* Persistent Sticky Top Header (Hidden on register/login) */}
        {!isAuthRoute && <Header {...getHeaderProps()} onTitleClick={() => handleRouteChange('/')} />}

        {/* Main Screen Views */}
        <main className="flex-1 w-full">
          <Suspense fallback={<LoadingFallback />}>
            {effectiveRoute === '/register' && (
              <RegisterView
                onRouteChange={handleRouteChange}
                onRegister={handleRegister}
              />
            )}

            {effectiveRoute === '/login' && (
              <LoginView
                onRouteChange={handleRouteChange}
                onLogin={handleLogin}
              />
            )}

            {effectiveRoute === '/' && (
              <HomeView
                markets={markets}
                lucky={lucky}
                onRouteChange={handleRouteChange}
                onOpenAddFunds={() => setIsAddFundsModalOpen(true)}
                onSelectMarket={(market) => {
                  setSelectedMarket(market);
                  handleRouteChange('/market');
                }}
                onOpenChart={(market, focus) => {
                  setSelectedMarket(market);
                  setChartFocus(focus ?? null);
                  handleRouteChange('/chart');
                }}
              />
            )}

            {effectiveRoute === '/chart' && (
              <ChartHistoryView
                markets={markets}
                selectedMarket={selectedMarket}
                onSelectMarket={(market) => setSelectedMarket(market)}
                onBack={() => handleRouteChange('/')}
                focus={chartFocus}
              />
            )}

            {effectiveRoute === '/results' && (
              <ResultsView
                onOpenChart={(marketId, focus) => {
                  const m = markets.find((x) => x.id === marketId) ?? null;
                  if (m) setSelectedMarket(m);
                  else {
                    // Fallback: create minimal market so chart can load by id even before markets sync
                    setSelectedMarket({
                      id: marketId,
                      name: marketId.toUpperCase(),
                      result: '',
                      openTime: '',
                      closeTime: '',
                    } as Market);
                  }
                  setChartFocus(focus);
                  handleRouteChange('/chart');
                }}
              />
            )}

            {effectiveRoute === '/charts' && <ChartsView focus={chartFocus} />}

            {effectiveRoute === '/schedule' && <ScheduleView markets={markets} />}

            {effectiveRoute === '/market' && (
              <MarketSelectionView
                selectedMarket={selectedMarket}
                gameTypes={gameTypes}
                onBack={() => handleRouteChange('/')}
                onSelectGameType={(gameType) => {
                  setSelectedGameType(gameType);
                  setIsBiddingModalOpen(true);
                }}
                onOpenChart={() => handleRouteChange('/chart')}
              />
            )}

            {effectiveRoute === '/wallet' && (
              <WalletView
                balance={user?.balance ?? 0}
                transactions={transactions}
                onRouteChange={handleRouteChange}
                onOpenAddFunds={() => setIsAddFundsModalOpen(true)}
              />
            )}

            {effectiveRoute === '/winnings' && (
              <WinningsView
                totalWinnings={winnings.totalWinnings}
                winningCount={winnings.winningCount}
                winningItems={winnings.items}
                onRouteChange={handleRouteChange}
              />
            )}

            {effectiveRoute === '/contact' && <ContactView />}

            {effectiveRoute === '/bids' && (
              <BidsView bids={bids} onRouteChange={handleRouteChange} />
            )}

            {effectiveRoute === '/orders' && (
              <OrderRecordView bids={bids} onRouteChange={handleRouteChange} />
            )}

            {(effectiveRoute === '/passbook' || effectiveRoute === '/finance') && (
              <FinanceView
                balance={user?.balance ?? 0}
                transactions={transactions}
                onRouteChange={handleRouteChange}
                onAddFunds={handleAddFunds}
                onWithdraw={handleWithdraw}
                bankDetails={bankDetails}
              />
            )}

            {effectiveRoute === '/notice-board' && <NoticeBoardView notices={notices} />}

            {effectiveRoute === '/game-rates' && <GameRatesView gameRates={gameRates} />}

            {effectiveRoute === '/bank-details' && (
              <BankDetailsView
                initialDetails={bankDetails}
                onSaveBankDetails={handleSaveBankDetails}
              />
            )}

            {effectiveRoute === '/how-to-play' && <HowToPlayView />}

            {effectiveRoute === '/profile' && (
              <ProfileView
                user={user as User}
                onUpdateUser={handleUpdateUser}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Slide Out Side Drawer (mobile only) */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user as User}
        onRouteChange={handleRouteChange}
        onOpenReferModal={() => setIsReferModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Modals */}
      <ReferModal
        isOpen={isReferModalOpen}
        onClose={() => setIsReferModalOpen(false)}
        referralCode={referralCode || 'SATMAT'}
      />

      <AddFundsModal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        onAddFunds={handleAddFunds}
      />

      <BiddingModal
        isOpen={isBiddingModalOpen}
        onClose={() => setIsBiddingModalOpen(false)}
        marketName={selectedMarket ? selectedMarket.name : 'SATMAT'}
        marketId={selectedMarket ? selectedMarket.id : ''}
        gameType={selectedGameType ? selectedGameType.title : 'Single Digit'}
        userBalance={user?.balance ?? 0}
        onPlaceBid={handlePlaceBid}
        onGoHome={() => {
          setIsBiddingModalOpen(false);
          handleRouteChange('/');
        }}
      />

      {/* PWA Install Popup — at login it shows every time when in browser */}
      <PWAInstallPrompt currentRoute={currentRoute} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </ErrorBoundary>
  );
}
