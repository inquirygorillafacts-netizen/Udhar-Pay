'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OwnerDashboardPage() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (auth.currentUser) {
        setUser(auth.currentUser);
    }
  }, [auth]);

  return (
    <div className="dashboard-container" style={{padding: '20px 0'}}>
      <div className="login-card" style={{marginTop: '2rem'}}>
        <div className="login-header">
           <h2 style={{ fontSize: '1.75rem' }}>Welcome, Owner!</h2>
           <p>This is your master dashboard. You can manage the entire application from here.</p>
        </div>
       
        <div style={{textAlign: 'center', wordBreak: 'break-all'}}>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>UID:</strong> {user?.uid}</p>
        </div>

      </div>
    </div>
  );
}
