// API client for the SATMAT web app.
//
// The UI is 100% live — every public endpoint (markets, results, charts,
// notices, game types/rates) is read straight from the backend. There are NO
// mock or sample data fallbacks in this app: if the backend is down or empty,
// the caller gets an error / empty state, never fabricated data.

import type {
  BankDetails,
  ChartRangeResponse,
  GameRate,
  LuckyNumber,
  Notice,
  ResultsResponse,
} from '../types';

// Resolve the backend base URL.
//
// Production (Vercel): the client uses same-origin requests (`/api/v1/*`)
// which next.config.ts proxies to the private `API_BASE_URL`. This keeps the
// backend origin out of the browser bundle. The browser env var is optional
// and only needed to force a specific origin (e.g. local dev against a
// separately hosted backend).
//
// Local dev: set NEXT_PUBLIC_API_BASE_URL to your local backend (e.g.
// http://localhost:8080) — the prefix is optional; /api/v1 is appended if
// missing.
//
// Production: the browser ALWAYS uses the same-origin proxy ("/api/v1/*")
// which next.config.ts rewrites to the private API_BASE_URL. We deliberately
// IGNORE NEXT_PUBLIC_API_BASE_URL in prod so a stray build-time env var can
// never make the client talk cross-origin (which would trigger CORS errors).
const DEFAULT_API_BASE = '/api/v1';

function resolveApiBase(raw: string | undefined): string {
  let base = (raw || '').replace(/\/+$/, '');
  if (!base) return DEFAULT_API_BASE;
  // A bare hostname (no scheme) is not a valid origin and would make fetch()
  // resolve against the current page → 404. Assume https.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(base) && !base.startsWith('/')) {
    base = `https://${base}`;
  }
  return /\/api\/v\d+$/i.test(base) ? base : `${base}/api/v1`;
}

const isProduction =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

const API_BASE = resolveApiBase(
  !isProduction &&
    ((typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)) ||
    '',
);

// ---- Live-only fetching (NO displayed-data cache — at any cost, the UI must
// never render a stale snapshot). Every public endpoint is fetched fresh from
// the network on each call. `inflight` only coalesces simultaneous duplicate
// requests (dedup), it never serves stored data. On failure callers throw and
// render an honest error/offline state — never old data.
// One-time cleanup: drop any legacy satmat_cache:* keys left by older builds.
if (typeof window !== 'undefined') {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('satmat_cache:')) localStorage.removeItem(k);
    }
  } catch {}
}

const inflight = new Map<string, Promise<any>>();
async function dedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fetcher().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// ---- Token storage (guarded for SSR) ----

const ACCESS_KEY = 'satmat_access_token';
const REFRESH_KEY = 'satmat_refresh_token';

export const getAccessToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  } catch {
    return null;
  }
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // storage unavailable — session cannot persist, caller handles it
  }
};

export const clearTokens = (): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
};

export const hasTokens = (): boolean => Boolean(getAccessToken() && getRefreshToken());

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now() + 5_000;
  } catch {
    // Unparseable token can never authenticate — treat as expired so the
    // client refreshes instead of firing a doomed /auth/me (401 flash).
    return true;
  }
};

// ---- API types (backend shapes) ----

export interface ApiUser {
  id: string;
  name: string;
  phone: string;
  balance: number; // ₹
  isGoldMember: boolean;
  referralCode: string;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface Wallet {
  balance: number; // ₹
  currency: string;
}

export interface DepositOrder {
  orderId: string;
  pgOrderId: string;
  upiIntent: string;
  qr: string;
  expiry: string;
  amount: number;
}

export interface WithdrawalRequest {
  requestId: string;
  status: string;
  amount: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ApiBid {
  id: string;
  marketId: string;
  gameType: string;
  number: string;
  amount: number; // ₹
  rate: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  round: 'OPEN' | 'CLOSE';
  date: string;
}

export interface ApiTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number; // ₹
  title: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Referral {
  code: string;
  totalReferrals: number;
  totalEarned: number;
  link: string;
}

export interface Winnings {
  totalWinnings: number; // ₹
  winningCount: number;
  items: Array<{
    id: string;
    marketName: string;
    gameType: string;
    number: string;
    amount: number;
    wonAmount: number;
    date: string;
  }>;
}

/** Server-authoritative market bidding status (GET /markets/:id/status). */
export interface MarketStatus {
  marketId: string;
  name: string;
  timezone: string;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULT_DECLARED';
  canBid: boolean;
  reason: 'MARKET_INACTIVE' | 'RESULT_DECLARED' | 'NOT_OPEN_YET' | 'CLOSED' | 'INVALID_SCHEDULE';
  /** Today's open declared: OPEN leg closed, CLOSE leg still biddable. */
  openDeclared: boolean;
  closeDeclared: boolean;
  opensAt: string | null;
  closesAt: string | null;
  serverTime: string;
}

/** User-friendly message for bid placement failures, keyed by backend code. */
export function bidErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'MARKET_NOT_OPEN':
        return e.message || 'Market has not opened yet. Please wait for the open time.';
      case 'MARKET_CLOSED':
        return e.message || 'Bidding is closed for this market.';
      case 'LEG_CLOSED':
        return e.message || 'Open result is declared. Only CLOSE bets are accepted now.';
      case 'IDEMPOTENCY_KEY_REQUIRED':
        return 'Could not place the bid securely. Please retry from the app.';
      case 'BID_WINDOW_EXPIRED':
        return 'The betting window just closed. Your bid was not placed and no money was deducted.';
      case 'MARKET_INACTIVE':
        return e.message || 'Bidding is currently disabled for this market.';
      case 'MARKET_NOT_FOUND':
        return 'Market not found. Please refresh and try again.';
      case 'INVALID_BID':
        return e.message || 'Invalid bid. Please check the number and game type.';
      case 'INVALID_AMOUNT':
        return e.message || 'Invalid bid amount.';
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient balance. Please add funds and try again.';
      case 'MOCK_DISABLED':
        return 'Online payments are not enabled right now. Please contact support to add funds.';
      case 'DUPLICATE_BID':
        return 'This bid was already submitted. Check your bids — no money was deducted twice.';
      case 'BID_NOT_CANCELLABLE':
        return e.message || 'Only pending bids can be cancelled.';
      default:
        return e.message || 'Could not place the bid. Please try again.';
    }
  }
  if (e instanceof Error) return e.message || 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// ---- Typed client ----

interface ApiClientOptions {
  getAccessToken: () => string | null;
  onRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private readonly options: ApiClientOptions) {}

  /** Convert ₹ to paise for request payloads (backend DTOs are in paise). */
  private paise(amount: number): number {
    return Math.round(amount * 100);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { idempotencyKey?: string; auth?: boolean; timeoutMs?: number } = {},
  ): Promise<T> {
    // Default 10s for most calls — 15s was too generous and made cold UI feel sluggish.
    // Auth calls override to 30s explicitly.
    const timeoutMs = opts.timeoutMs ?? 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (opts.auth !== false) {
        const token = this.options.getAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

      let res: Response;
      try {
        res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          signal: controller.signal,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (err: unknown) {
        // Network failure (ERR_CONNECTION_REFUSED, DNS, offline) — surface as ApiError with status 0 instead of raw TypeError/Event
        const message =
          err instanceof Error
            ? err.message
            : err instanceof Event
              ? (err as any).type || '[object Event]'
              : String(err);
        const isAbort =
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Event && (err as any).type === 'abort');
        if (isAbort) throw new ApiError(0, 'TIMEOUT', `Request timed out after ${timeoutMs}ms`);
        // Only log network errors once per session to avoid console flooding
        if (typeof window !== 'undefined' && !(window as any).__satmat_network_warned) {
          (window as any).__satmat_network_warned = true;
          // eslint-disable-next-line no-console
          console.warn(`[api] Network error for ${method} ${path}: ${message}. Backend at ${API_BASE} may be unreachable.`);
        }
        throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach server. Please check if backend is running.');
      }

      if (res.status === 401 && opts.auth !== false && this.options.onRefresh) {
        if (!this.refreshing) {
          this.refreshing = this.tryRefresh().finally(() => {
            this.refreshing = null;
          });
        }
        const ok = await this.refreshing;
        if (ok) return this.request<T>(method, path, body, opts);
        this.options.onUnauthorized?.();
        throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please login again.');
      }

      // SSO-wall guard: fetch() follows Vercel Deployment Protection redirects
      // and returns the 200 HTML login page — which used to parse as null and
      // silently paint empty screens ("data missing"). Detect non-JSON and
      // fail loudly instead so the UI can say what's actually wrong.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new ApiError(
          0,
          'SSO_BLOCKED',
          'Site protection is blocking data. Please open the live app URL (not a preview link) or disable Deployment Protection in Vercel.',
        );
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error;
        throw new ApiError(
          res.status,
          err?.code || 'ERROR',
          err?.message || res.statusText || `Request failed (${res.status})`,
          err?.details,
        );
      }
      if (data === null || data === undefined) {
        throw new ApiError(0, 'EMPTY_RESPONSE', 'Server returned an empty response. Please retry.');
      }
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  public async silentRefresh(): Promise<boolean> {
    return this.tryRefresh();
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const tokens = (await res.json()) as AuthResponse;
        this.options.onRefresh?.({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        return true;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  }

  /** Live GET: always hits the network (deduped while in-flight). Never serves stored data. */
  private async liveGet<T>(key: string, path: string): Promise<T> {
    return dedup(key, () => this.request<T>('GET', path, undefined, { auth: false }));
  }

  /** Lightweight public probe used to wake a sleeping backend before auth calls. */
  ping(timeoutMs = 5000) {
    // Use /health which is excluded from /api/v1 prefix — fastest cold-start probe
    // Fall back to server-time if health is not reachable via proxy rewrite.
    // Keep timeout short so warm-up doesn't block user interaction.
    return this.request<{ status?: string; iso?: string }>('GET', '/health', undefined, { auth: false, timeoutMs }).catch(() =>
      this.request<{ iso: string }>('GET', '/server-time', undefined, { auth: false, timeoutMs }),
    );
  }

  /** Fire-and-forget warm-up — call on app mount so backend is hot when user clicks Login */
  warmUp() {
    if (typeof window === 'undefined') return;
    // Don't block: ping in background, swallow errors. Use 4s timeout to avoid hanging.
    this.ping(4000).catch(() => {});
  }

  // ---- Auth ----
  // login/register: cold-start on Render free tier can be 8-15s. We use 30s
  // (not 60s) + a single retry via App.tsx wakeBackend, so the user sees
  // feedback quickly instead of staring at a 60s spinner.
  login(phone: string, password: string) {
    return this.request<AuthResponse>(
      'POST',
      '/auth/login',
      { phone, password },
      { auth: false, timeoutMs: 30000 },
    );
  }
  register(body: { name: string; phone: string; password: string; referralCode?: string }) {
    return this.request<AuthResponse>(
      'POST',
      '/auth/register',
      body,
      { auth: false, timeoutMs: 30000 },
    );
  }
  logout(refreshToken: string) {
    return this.request<void>('POST', '/auth/logout', { refreshToken }, { auth: false });
  }
  async me(): Promise<ApiUser | null> {
    try {
      return await this.request<ApiUser>('GET', '/auth/me');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
      throw e;
    }
  }
  updateMe(body: { name?: string; phone?: string }) {
    return this.request<ApiUser>('PATCH', '/auth/me', body);
  }
  sendOtp(body: { phone: string; purpose: 'login' | 'forgot-password' }) {
    return this.request<{ requestId: string; expiresInSec: number }>('POST', '/auth/otp/send', body, { auth: false });
  }
  verifyOtp(body: { requestId: string; otp: string }) {
    return this.request<{ resetVerified: boolean; resetToken: string; requestId: string }>('POST', '/auth/otp/verify', body, { auth: false });
  }
  resetPassword(body: { requestId: string; otp: string; newPassword: string }) {
    return this.request<void>('POST', '/auth/password/reset', body, { auth: false });
  }

  // ---- Markets & content (public) — LIVE-ONLY, every call hits the network.
  // The `force` param is kept for compatibility (manual refresh passes true)
  // but all reads are already live; nothing is ever served from storage.
  async markets(_force = false): Promise<import('../types').Market[]> {
    return this.liveGet<import('../types').Market[]>('markets', '/markets');
  }
  async gameTypes(marketId?: string): Promise<import('../types').MarketGameType[]> {
    const key = marketId ? `gameTypes:${marketId}` : 'gameTypes';
    const path = marketId ? `/game-types?market=${encodeURIComponent(marketId)}` : '/game-types';
    return this.liveGet<import('../types').MarketGameType[]>(key, path);
  }
  async gameRates(): Promise<GameRate[]> {
    return this.liveGet<GameRate[]>('gameRates', '/game-rates');
  }
  async notices(): Promise<Notice[]> {
    return this.liveGet<Notice[]>('notices', '/notices');
  }
  async howToPlay(): Promise<{ sections: Array<{ title: string; body: string }> }> {
    return this.liveGet<{ sections: Array<{ title: string; body: string }> }>('howToPlay', '/how-to-play');
  }
  async stats(): Promise<{ activePlayers: number; liveMarkets: number; withdrawalTime: string; supportHours: string }> {
    return this.liveGet<{ activePlayers: number; liveMarkets: number; withdrawalTime: string; supportHours: string }>('stats', '/stats');
  }
  /**
   * Server-authoritative bidding status for one market (countdown source).
   * UI-only: POST /bids always re-validates the window at commit time.
   */
  async marketStatus(marketId: string): Promise<MarketStatus> {
    return this.request<MarketStatus>('GET', `/markets/${encodeURIComponent(marketId)}/status`, undefined, { auth: false });
  }
  /** Today's provider lucky numbers (null = not published yet — never fabricated).
   *  Tolerant to transient backend 5xx (e.g. table migrating, cold start):
   *  those also mean "awaiting", not a fatal error — return null so the
   *  10s poll loop and loadAll() don't spam console 500s or flip offline. */
  async luckyNumber(): Promise<LuckyNumber | null> {    try {
      return await dedup('lucky-number', () =>
        this.request<LuckyNumber | null>('GET', '/lucky-number', undefined, { auth: false }),
      );
    } catch (e) {
      if (e instanceof ApiError && (e.status >= 500 || e.status === 0)) return null;
      throw e;
    }
  }
  referral() {
    return this.request<Referral>('GET', '/referral');
  }

  // ---- Bids ----
  placeBid(
    body: { marketId: string; gameType: string; number: string; amount: number },
    idemKey: string,
  ) {
    return this.request<{ bid: ApiBid }>(
      'POST',
      '/bids',
      { ...body, amount: this.paise(body.amount) },
      { idempotencyKey: idemKey },
    );
  }
  placeBulkBid(
    body: {
      marketId: string;
      gameType: string;
      round: 'OPEN' | 'CLOSE';
      items: Array<{ number: string; amount: number }>;
    },
    idemKey: string,
  ) {
    return this.request<{ bids: ApiBid[]; totalAmount: number }>(
      'POST',
      '/bids/bulk',
      { ...body, items: body.items.map((i) => ({ ...i, amount: this.paise(i.amount) })) },
      { idempotencyKey: idemKey },
    );
  }
  bids(params: { status?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<Paged<ApiBid>>('GET', `/bids?${q}`);
  }

  // ---- Wallet ----
  wallet() {
    return this.request<Wallet>('GET', '/wallet');
  }
  deposit(amount: number, idemKey: string) {
    return this.request<DepositOrder>(
      'POST',
      '/wallet/deposit',
      { amount: this.paise(amount), method: 'upi' },
      { idempotencyKey: idemKey },
    );
  }
  verifyDeposit(orderId: string, idemKey: string) {
    return this.request<{ status: string; balance: number }>(
      'POST',
      `/wallet/deposit/${orderId}/verify`,
      {},
      { idempotencyKey: idemKey },
    );
  }
  withdraw(
    body: { amount: number; payout: 'bank' | 'upi'; upiId?: string; bankDetailsId?: string },
    idemKey: string,
  ) {
    return this.request<WithdrawalRequest>(
      'POST',
      '/wallet/withdraw',
      { ...body, amount: this.paise(body.amount) },
      { idempotencyKey: idemKey },
    );
  }
  transactions(params: { type?: string; search?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<Paged<ApiTransaction>>('GET', `/transactions?${q}`);
  }
  bankDetails() {
    return this.request<BankDetails | null>('GET', '/bank-details');
  }
  saveBankDetails(details: BankDetails) {
    return this.request<BankDetails>('POST', '/bank-details', details);
  }
  winnings() {
    return this.request<Winnings>('GET', '/winnings');
  }

  // ---- Orders (payment orders, distinct from Bids) ----
  orders(params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<Paged<{ id: string; marketName: string; amount: number; status: string; type: string; date: string }>>('GET', `/orders?${q}`);
  }

  withdrawals(params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<Paged<{ id: string; amount: number; status: string; payout: string; upiId?: string; date: string }>>('GET', `/wallet/withdrawals?${q}`);
  }

  // ---- Referral bonus claim ----
  claimReferral(inviteePhone: string) {
    return this.request<{ bonusCredited: boolean; bonus?: number; reason?: string }>('POST', '/referral/claim', { inviteePhone });
  }

  // ---- Bids extra ----
  getBid(id: string) {
    return this.request<ApiBid>('GET', `/bids/${encodeURIComponent(id)}`);
  }
  cancelBid(id: string, idemKey: string) {
    return this.request<ApiBid>('POST', `/bids/${encodeURIComponent(id)}/cancel`, {}, { idempotencyKey: idemKey });
  }

  // ---- Sync & App config (public) ----
  serverTime() {
    return this.request<{ iso: string }>('GET', '/server-time', undefined, { auth: false });
  }
  appConfig() {
    return this.request<{ minAppVersion: string; forceUpdate: boolean; banners: unknown[]; supportContacts: Record<string, unknown> }>('GET', '/app-config', undefined, { auth: false });
  }
  sync(since?: string) {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.request<{ user: ApiUser | null; balance: number; markets: import('../types').Market[]; notices: Notice[]; bids: ApiBid[]; transactions: ApiTransaction[]; syncedAt: string }>('GET', `/sync${q}`);
  }

  // ---- Support tickets & chat ----
  createSupportTicket(body: { subject: string; message: string }) {
    return this.request<{ ticketId: string }>('POST', '/support/tickets', body);
  }
  getSupportTicketMessages(ticketId: string) {
    return this.request<{ messages: Array<{ text: string; from: string; createdAt: string; id?: string }> }>('GET', `/support/tickets/${encodeURIComponent(ticketId)}/messages`);
  }
  sendSupportMessage(ticketId: string, text: string) {
    return this.request<{ id: string; text: string; from: string; createdAt: string }>('POST', `/support/chat/messages?ticketId=${encodeURIComponent(ticketId)}`, { text });
  }
  getSupportMessages(ticketId: string) {
    return this.request<{ messages: Array<{ id: string; text: string; from: string; createdAt: string }> }>('GET', `/support/chat/messages?ticketId=${encodeURIComponent(ticketId)}`);
  }

  // ---- Notifications ----
  notifications(params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<Paged<{ id: string; title: string; body: string; isRead: boolean; createdAt: string }>>('GET', `/notifications?${q}`);
  }
  markNotificationsRead(ids: string[]) {
    return this.request<void>('POST', '/notifications/read', { ids });
  }
  registerDevice(deviceToken: string, platform: 'android' | 'ios') {
    return this.request<void>('POST', '/notifications/device', { deviceToken, platform });
  }
  unregisterDevice(deviceToken: string) {
    return this.request<void>('DELETE', '/notifications/device', { deviceToken } as any);
  }

  // ---- AI ----
  aiChat(prompt: string, context?: string) {
    return this.request<{ reply: string }>('POST', '/ai/chat', { prompt, context });
  }

  // ---- Newsletter (public) ----
  subscribeNewsletter(email: string) {
    return this.request<{ ok: boolean }>('POST', '/newsletter/subscribe', { email }, { auth: false });
  }
}

/** Singleton used across the app. */
export const api = new ApiClient({
  getAccessToken,
  onRefresh: ({ accessToken, refreshToken }) => setTokens(accessToken, refreshToken),
  onUnauthorized: () => clearTokens(),
});

// ---- Results & Charts screens (offline fallback preserved) ----
// Keep 8000ms — backend now has server-side cache (15-20s TTL) so Supabase cold-start
// no longer blocks every request; 12000ms made the UI feel sluggish on slow networks.
async function request<T>(path: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    } catch (err: unknown) {
      const isAbort =
        (err instanceof DOMException && (err as any).name === 'AbortError') ||
        (err instanceof Event && (err as any).type === 'abort');
      if (isAbort) throw new ApiError(0, 'TIMEOUT', `Request timed out after ${timeoutMs}ms`);
      if (err instanceof Event) {
        throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach server. Please check if backend is running.');
      }
      throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach server. Please check if backend is running.');
    }
    // Same SSO-wall guard as ApiClient.request: a followed redirect to the
    // Vercel login page returns 200 HTML — never treat it as data.
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new ApiError(
        0,
        'SSO_BLOCKED',
        'Site protection is blocking data. Please open the live app URL (not a preview link) or disable Deployment Protection in Vercel.',
      );
    }
    if (!res.ok) {
      let message = `API ${res.status}`;
      try {
        const err = (await res.json()) as { error?: { message?: string } };
        if (err.error?.message) message = err.error.message;
      } catch {
        // ignore body parse errors
      }
      throw new ApiError(res.status, 'ERROR', message);
    }
    const data = (await res.json().catch(() => null)) as T | null;
    if (data === null || data === undefined) {
      throw new ApiError(0, 'EMPTY_RESPONSE', 'Server returned an empty response. Please retry.');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export interface FetchResult<T> {
  data: T;
  offline: boolean;
}

export async function fetchResults(_force = false): Promise<FetchResult<ResultsResponse>> {
  // LIVE-ONLY: always fetch fresh (`force` kept for compatibility). On failure
  // throw so callers render an honest error — never a stale snapshot.
  // Empty markets is an honest "no results yet" state — render it as-is (live,
  // empty). We never synthesise results.
  const data = await dedup('results', () => request<ResultsResponse>('/results'));
  return { data, offline: false };
}

export async function fetchChartRange(
  params: {
    market: string;
    startDate: string;
    endDate: string;
  },
  _force = false,
): Promise<FetchResult<ChartRangeResponse>> {
  // LIVE-ONLY: always fetch fresh. Empty data is an honest "no results for
  // this range" state — render as-is. We never fabricate chart records.
  // Timeout scales with range: full-history pulls (~2600 rows) get up to 30s.
  const key = `charts:${params.market}:${params.startDate}:${params.endDate}`;
  const q = new URLSearchParams(params);
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(`${params.endDate}T00:00:00Z`) - Date.parse(`${params.startDate}T00:00:00Z`)) / 86400000,
    ),
  );
  const timeoutMs = Math.min(30000, 8000 + (Number.isFinite(days) ? days : 0) * 8);
  const data = await dedup(key, () => request<ChartRangeResponse>(`/charts?${q}`, timeoutMs));
  return { data, offline: false };
}

export { API_BASE };