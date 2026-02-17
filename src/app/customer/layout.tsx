'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User, BookText, QrCode } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';

export default function CustomerLayout({
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
        router.replace('/login/customer');
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
  
  const isScanActive = pathname === '/customer/scan';

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/customer/dashboard" className={`admin-nav-item ${pathname === '/customer/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
        <Link href="/customer/ledger" className={`admin-nav-item ${pathname === '/customer/ledger' ? 'active' : ''}`}>
          <BookText size={24} />
          <span>History</span>
        </Link>
        
        <Link 
          href="/customer/scan" 
          className={`admin-nav-item admin-nav-item-primary ${isScanActive ? 'active' : ''}`}
        >
          <QrCode size={30} />
          <span style={{marginTop: '2px'}}>Scan</span>
        </Link>

        <Link href="/customer/credit-cards" className={`admin-nav-item ${pathname.startsWith('/customer/credit-cards') ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Services</span>
        </Link>

        <Link href="/customer/profile" className={`admin-nav-item ${pathname === '/customer/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
