'use client';

import React from 'react';

function toErrorInfo(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) return { message: value.message || 'Unknown error', stack: value.stack };
  if (value instanceof Event) {
    const target = value.target as any;
    const msg =
      (target && (target.error?.message || target.reason?.message || target.src)) ||
      (value as any).message ||
      (value as any).reason ||
      value.type ||
      'Unknown event error';
    return { message: typeof msg === 'string' ? msg : 'An unexpected event error occurred' };
  }
  if (typeof value === 'string') return { message: value };
  try {
    return { message: String(value) === '[object Event]' ? 'An unexpected error occurred. Please refresh.' : String(value) };
  } catch {
    return { message: 'An unexpected error occurred' };
  }
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const info = toErrorInfo(error);
    return { hasError: true, message: info.message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const e = toErrorInfo(error);
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', e.message, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-[#0F172A] px-6 py-12">
          <div className="max-w-md w-full text-center bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
            <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]" style={{ fontFamily: 'var(--font-body)' }}>
              {this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-3 rounded-xl bg-[#0EA5E9] text-[#0F172A] font-bold hover:bg-[#14B8A6] transition"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
