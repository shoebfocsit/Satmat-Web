export interface User {
  name: string;
  phone: string;
  balance: number;
  id: string;
  isGoldMember: boolean;
  referralCode?: string;
  roles?: string[];
}

export interface Market {
  id: string;
  name: string;
  result: string;
  /** YYYY-MM-DD of the latest declared result (today when lively) */
  resultDate?: string | null;
  /** Display order (1-7 day games, 8-14 night games) */
  order?: number;
  openTime: string;
  closeTime: string;
  isLive?: boolean;
  isClosed?: boolean;
  /** Server-authoritative bidding gate (UI hint only — POST /bids re-checks). */
  status?: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULT_DECLARED';
  canBid?: boolean;
  serverTime?: string;
  jodi?: string | null;
  panel?: string | null;
  highlight?: boolean;
}

export interface MarketGameType {
  id: string;
  title: string;
  iconName: string;
  isOpen: boolean;
  code?: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  title: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Bid {
  id: string;
  marketName: string;
  gameType: string;
  numberSelected: string;
  amount: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  date: string;
}

export interface Order {
  id: string;
  marketName: string;
  amount: number;
  status: string;
  type: string;
  date: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  payout: string;
  upiId?: string;
  date: string;
}

export interface SupportMessage {
  id?: string;
  text: string;
  from: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppConfig {
  minAppVersion: string;
  forceUpdate: boolean;
  banners: unknown[];
  supportContacts: Record<string, unknown>;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  isImportant?: boolean;
}

export interface GameRate {
  id: string;
  gameType: string;
  rateRange: string;
}

export interface LuckyNumber {
  date: string;
  ank: string;
  finalAnk: string;
  source: string;
}

export interface ChartRecord {
  date: string;
  open: string;
  openAnk: string;
  jodi: string;
  close: string;
  closeAnk: string;
}

export interface WeekGroup {
  label: string;
  records: ChartRecord[];
}

export interface BankDetails {
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

// ---- Results & Charts screens (backed by GET /api/v1/results & /api/v1/charts) ----

export interface ResultMarket {
  id: string;
  name: string;
  highlight: boolean;
  openTime: string;
  closeTime: string;
  result: {
    jodi: string | null;
    panel: string | null;
    open?: string | null;
    close?: string | null;
    date: string;
    source: string;
  } | null;
}

export interface ResultsResponse {
  updatedAt: string;
  markets: ResultMarket[];
}

export interface ChartResultRecord {
  date: string;
  jodi: string | null;
  panel: string | null;
  open: string | null;
  close: string | null;
  source: string;
}

export interface ChartRangeResponse {
  market: string;
  marketId: string;
  startDate: string;
  endDate: string;
  source: string;
  count: number;
  data: ChartResultRecord[];
  /** Calendar dates in [startDate, endDate] with no record — never fabricated. */
  missingDates: string[];
}

export type AppRoute =
  | '/register'
  | '/login'
  | '/'
  | '/market'
  | '/chart'
  | '/charts'
  | '/schedule'
  | '/results'
  | '/wallet'
  | '/winnings'
  | '/bids'
  | '/orders'
  | '/passbook'
  | '/finance'
  | '/contact'
  | '/profile'
  | '/notice-board'
  | '/game-rates'
  | '/bank-details'
  | '/how-to-play';
