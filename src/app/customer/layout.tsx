'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User, BookText, MessageCircle, QrCode, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';

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
          <span>Ledger</span>
        </Link>
        
        {/* --- Center Primary Buttons --- */}
        <Link href="/ai-assistant" className="admin-nav-item admin-nav-item-primary" style={{
            transform: 'translateY(-20px) translateX(-5px)', // Adjusted for two buttons
            width: '65px',
            height: '65px',
            borderRadius: '50%',
            background: '#00c896',
            color: 'white',
            boxShadow: '0 -5px 20px rgba(0, 200, 150, 0.3)',
        }}>
          <MessageCircle size={30} />
        </Link>
        <Link href="/customer/scan" className="admin-nav-item admin-nav-item-primary" style={{
            transform: 'translateY(-20px) translateX(5px)', // Adjusted for two buttons
            width: '65px',
            height: '65px',
            borderRadius: '50%',
            background: '#3d4468',
            color: 'white',
            boxShadow: '0 -5px 20px rgba(61, 68, 104, 0.3)',
        }}>
          <QrCode size={30} />
        </Link>
        {/* --- End Center Buttons --- */}

        <Link href="/customer/profile" className={`admin-nav-item ${pathname === '/customer/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
        <Link href="/customer/helpline" className={`admin-nav-item ${pathname === '/customer/helpline' ? 'active' : ''}`}>
          <LifeBuoy size={24} />
          <span>Help</span>
        </Link>
      </nav>
    </div>
  );
}
