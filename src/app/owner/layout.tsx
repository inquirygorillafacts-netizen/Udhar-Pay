'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, CreditCard, Wallet, Network, LandPlot, Bell, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';


export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Verify owner role on every auth state change. This is the definitive check.
          const userDocRef = doc(firestore, 'owner_o2Vco2LqnvWsZijYtb4EDMNdOOC2', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().role === '**##owner_XwJfOW27AvfN5ELUzbUPpXPcbG73_locked##**') {
            setIsAuthorized(true);
          } else {
            // User is logged in but is not an owner. Redirect immediately.
            setIsAuthorized(false);
            router.replace('/auth');
          }
        } catch (error) {
          console.error("Error verifying owner role:", error);
          setIsAuthorized(false);
          router.replace('/auth');
        }
      } else {
        // No user logged in.
        setIsAuthorized(false);
        router.replace('/login/owner');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);

  // While checking authorization, show a full-screen loader to prevent UI flash.
  if (loading || !isAuthorized) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }

  // Only render the layout and children if authorization is successful.
  return (
    <div style={{ paddingBottom: '80px' }}>
      <main>{children}</main>

      <nav className="admin-bottom-nav">
        <Link href="/owner/dashboard" className={`admin-nav-item ${pathname === '/owner/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </Link>
         <Link href="/owner/ecosystem" className={`admin-nav-item ${pathname.startsWith('/owner/ecosystem') || pathname.startsWith('/owner/shopkeeper') ? 'active' : ''}`}>
          <Network size={24} />
          <span>Ecosystem</span>
        </Link>
         <Link href="/owner/control" className={`admin-nav-item ${pathname === '/owner/control' ? 'active' : ''}`}>
          <SlidersHorizontal size={24} />
          <span>Control</span>
        </Link>
         <Link href="/owner/loan-applications" className={`admin-nav-item ${pathname === '/owner/loan-applications' ? 'active' : ''}`}>
          <LandPlot size={24} />
          <span>Loans</span>
        </Link>
        <Link href="/owner/wallet" className={`admin-nav-item ${pathname === '/owner/wallet' ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Wallet</span>
        </Link>
         <Link href="/owner/notifications" className={`admin-nav-item ${pathname === '/owner/notifications' ? 'active' : ''}`}>
          <Bell size={24} />
          <span>Notify</span>
        </Link>
        <Link href="/owner/settings" className={`admin-nav-item ${pathname === '/owner/settings' ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
