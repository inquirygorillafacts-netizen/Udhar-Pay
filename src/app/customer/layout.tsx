'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, User } from 'lucide-react';
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in.
        setUser(user);
        setLoading(false);
      } else {
        // User is signed out, redirect to login page.
        router.replace('/customer/login');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    // This case should ideally not be hit due to the redirect, but as a fallback.
    return null; 
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/customer/dashboard" className={`admin-nav-item ${pathname === '/customer/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
        <Link href="/customer/profile" className={`admin-nav-item ${pathname === '/customer/profile' ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
