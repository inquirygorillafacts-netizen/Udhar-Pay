'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User, MessageCircle, LifeBuoy } from 'lucide-react';
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

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/shopkeeper/dashboard" className={`admin-nav-item ${pathname === '/shopkeeper/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
        <Link href="/ai-assistant" className={`admin-nav-item ${pathname === '/ai-assistant' ? 'active' : ''}`}>
            <MessageCircle size={24} />
            <span>AI</span>
        </Link>
         <Link href="/shopkeeper/profile" className={`admin-nav-item ${pathname === '/shopkeeper/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
        <Link href="/shopkeeper/helpline" className={`admin-nav-item ${pathname === '/shopkeeper/helpline' ? 'active' : ''}`}>
          <LifeBuoy size={24} />
          <span>Help</span>
        </Link>
      </nav>
    </div>
  );
}
