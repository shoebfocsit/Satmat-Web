'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle size={40} className="text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
          <p className="text-neutral-400">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        {isDev && error.message && (
          <details className="text-left bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 space-y-2">
            <summary className="font-mono text-xs text-neutral-400 cursor-pointer">
              Error Details (Development)
            </summary>
            <pre className="text-[11px] text-neutral-300 overflow-x-auto max-h-48">{error.message}</pre>
            {error.digest && (
              <p className="text-[10px] text-neutral-500 font-mono">Digest: {error.digest}</p>
            )}
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex-1 py-3 px-6 rounded-xl bg-[#0EA5E9] hover:bg-sky-300 text-[#1A1A1A] font-bold text-base shadow-lg shadow-blue-400/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 py-3 px-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold text-base active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Home size={18} />
            <span>Go Home</span>
          </button>
        </div>

        <p className="text-[11px] text-neutral-500">
          If this persists, please contact support.
        </p>
      </div>
    </div>
  );
}