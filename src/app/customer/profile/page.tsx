'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerProfilePage() {
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

  const handleSignOut = async () => {
    await auth.signOut();
    localStorage.removeItem('activeRole');
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Profile</h1>
      <p>Manage your account details here.</p>
      <p>Email: {user?.email}</p>
      <button className="neu-button sign-out-btn" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
}
