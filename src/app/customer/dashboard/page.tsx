'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerDashboardPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // The layout already protects this page, 
    // but we can still grab the user info here.
    if (auth.currentUser) {
        setUser(auth.currentUser);
    }
  }, [auth]);

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
