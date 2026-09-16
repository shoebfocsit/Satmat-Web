import type {Metadata, Viewport} from 'next';
import { Outfit, Space_Grotesk, DM_Sans, Inter } from 'next/font/google';
import React from 'react';
import '../index.css';

const outfit = Outfit({ subsets: ['latin'], weight: ['300','400','500','600','700','800'], display: 'swap', variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], display: 'swap', variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400','500','600','700'], display: 'swap', variable: '--font-auth' });
const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], display: 'swap', variable: '--font-auth-body' });

export const metadata: Metadata = {
  title: 'SATMAT | Play Satta Matka Online',
  description:
    'SATMAT - India\'s trusted Satta Matka gaming platform. Play Single Digit, Jodi, Panna, Sangam and more with fast withdrawals.',
  applicationName: 'SATMAT',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SATMAT',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0EA5E9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${inter.variable}`}>
      <head>
        {/* crossOrigin="use-credentials" is required for Vercel Deployment Protection (SSO) —
            without it the browser fetches /manifest.json without cookies, gets a 302 to
            https://vercel.com/sso-api... and then blocks the redirect due to CORS.
            With use-credentials the auth cookie is sent and the redirect is avoided. */}
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="/background.webp" fetchPriority="high" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  );
}
