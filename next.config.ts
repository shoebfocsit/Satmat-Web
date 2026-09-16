import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Backend is the Render app the project is actually deployed against.
const BACKEND_BASE = 'https://satmat-backendfinal.onrender.com';

// Backend origin is derived from the private API_BASE_URL (server-side only).
// The browser never sees this URL — /api/v1/* requests are proxied to the
// backend via the rewrites() below, so CSP only needs to allow the same
// origin ('self') plus the backend origin for server-side fetches.
// If API_BASE_URL is unset (or set to a stale value), it falls back to the
// canonical BACKEND_BASE so the site never talks to an old/unlisted backend.
const apiBase = process.env.API_BASE_URL || BACKEND_BASE;
let apiOrigin = '';
try {
  apiOrigin = apiBase ? new URL(apiBase).origin : '';
} catch {
  apiOrigin = '';
}

// Always allow the real backend + Vercel (SSO/preview manifest) regardless of
// what the build-time env vars are, so CSP never blocks the live feature.
const kBackendOrigin = new URL(BACKEND_BASE).origin;

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "manifest-src 'self' https://vercel.com https://vercel.live https://*.vercel.app https://*.vercel.com",
  `connect-src 'self' ${kBackendOrigin}${apiOrigin && apiOrigin !== kBackendOrigin ? ` ${apiOrigin}` : ''} https://vercel.com https://vercel.live https://*.vercel.app https://*.vercel.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: !isDev ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    if (!apiBase) {
      return [];
    }
    const base = apiBase.replace(/\/$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${base}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // `cross-origin` is required so the manifest (fetched with
          // crossOrigin="use-credentials") is not blocked when Vercel
          // Deployment Protection issues a 302 to https://vercel.com/sso-api.
          // `same-origin` caused CORS block: No 'Access-Control-Allow-Origin'.
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/icon-192x192.png',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon-512x512.png',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/background.webp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;