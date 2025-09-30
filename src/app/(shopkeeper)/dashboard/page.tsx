'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ShopkeeperDashboardPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/shopkeeper');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router]);

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  return (
    <div className="dashboard-container">
        <h1>Welcome, Shopkeeper</h1>
        <p>Your dashboard is ready.</p>
        <p>Email: {user?.email}</p>
        <button className="neu-button sign-out-btn" onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
}
