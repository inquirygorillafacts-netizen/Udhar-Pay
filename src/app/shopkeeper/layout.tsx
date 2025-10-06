'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User, LifeBuoy, Users, PieChart, Bot, Wallet, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';

export default function ShopkeeperLayout({
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
        router.replace('/login/shopkeeper');
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
  
  const isAiAssistantActive = pathname.startsWith('/shopkeeper/ai-assistant');
  const isCustomersActive = pathname.startsWith('/shopkeeper/customers');

  // Do not render the main layout with nav bar for the full-screen AI assistant
  if (isAiAssistantActive) {
      return <>{children}</>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/shopkeeper/dashboard" className={`admin-nav-item ${pathname === '/shopkeeper/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
        <Link href="/shopkeeper/customers" className={`admin-nav-item ${isCustomersActive ? 'active' : ''}`}>
          <Users size={24} />
          <span>Customers</span>
        </Link>
         <Link href="/shopkeeper/analysis" className={`admin-nav-item ${pathname === '/shopkeeper/analysis' ? 'active' : ''}`}>
          <PieChart size={24} />
          <span>Analysis</span>
        </Link>
         <Link href="/shopkeeper/wallet" className={`admin-nav-item ${pathname === '/shopkeeper/wallet' ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Wallet</span>
        </Link>
        <Link href="/shopkeeper/ai-assistant/voice" className={`admin-nav-item ${isAiAssistantActive ? 'active' : ''}`}>
            <Bot size={24} />
            <span>AI</span>
        </Link>
         <Link href="/shopkeeper/profile" className={`admin-nav-item ${pathname === '/shopkeeper/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
