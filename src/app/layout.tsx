import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import React from 'react';
import PWALoader from '@/components/pwa/PWALoader';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Udhar Pay',
  description: 'Digital Ledger for Shopkeepers and Customers',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e0e5ec" />
      </head>
      <body>
        <FirebaseClientProvider>
          <PWALoader />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
