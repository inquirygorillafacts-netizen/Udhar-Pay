'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, CreditCard, Wallet, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setLoading(false);
      } else {
        router.replace('/login/owner');
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/owner/dashboard" className={`admin-nav-item ${pathname === '/owner/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
         <Link href="/owner/ecosystem" className={`admin-nav-item ${pathname.startsWith('/owner/ecosystem') ? 'active' : ''}`}>
          <Network size={24} />
          <span>Ecosystem</span>
        </Link>
         <Link href="/owner/sell-credit-card" className={`admin-nav-item ${pathname === '/owner/sell-credit-card' ? 'active' : ''}`}>
          <CreditCard size={24} />
          <span>Sell Card</span>
        </Link>
        <Link href="/owner/wallet" className={`admin-nav-item ${pathname === '/owner/wallet' ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Wallet</span>
        </Link>
        <Link href="/owner/settings" className={`admin-nav-item ${pathname === '/owner/settings' ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
