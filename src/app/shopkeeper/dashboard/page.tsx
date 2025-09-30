'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ShopkeeperDashboardPage() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (auth.currentUser) {
        setUser(auth.currentUser);
    }
  }, [auth]);

  return (
    <div className="dashboard-container">
      <div className="login-card" style={{marginTop: '2rem'}}>
        <div className="login-header">
           <h2 style={{ fontSize: '1.75rem' }}>Welcome, Shopkeeper!</h2>
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
