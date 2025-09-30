'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerDashboardPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        router.replace('/customer/login');
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
    <div className="dashboard-container">
      <div className="login-card" style={{marginTop: '2rem'}}>
        <div className="login-header">
           <h2 style={{ fontSize: '1.75rem' }}>Welcome, Customer!</h2>
           <p>This is your dashboard. You can manage your activities here.</p>
        </div>
       
        <div style={{textAlign: 'center', wordBreak: 'break-all'}}>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>UID:</strong> {user?.uid}</p>
        </div>

      </div>
    </div>
  );
}
