'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User, BookText, Bot, QrCode, CreditCard } from 'lucide-react';
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
  
  const isAiAssistantActive = pathname.startsWith('/customer/ai-assistant');
  const isScanActive = pathname === '/customer/scan';

  // Do not render the main layout with nav bar for the full-screen AI assistant
  if (isAiAssistantActive) {
      return <>{children}</>;
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
          <span>History</span>
        </Link>
        
        <Link 
          href="/customer/scan" 
          className={`admin-nav-item admin-nav-item-primary ${isScanActive ? 'active' : ''}`}
        >
          <QrCode size={30} />
          <span style={{marginTop: '2px'}}>Scan</span>
        </Link>

        <Link href="/customer/ai-assistant/voice" className={`admin-nav-item ${isAiAssistantActive ? 'active' : ''}`}>
          <Bot size={24} />
          <span>AI</span>
        </Link>

        <Link href="/customer/credit-cards" className={`admin-nav-item ${pathname === '/customer/credit-cards' ? 'active' : ''}`}>
          <CreditCard size={24} />
          <span>Cards</span>
        </Link>

        <Link href="/customer/profile" className={`admin-nav-item ${pathname === '/customer/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
