'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';

// This component acts as a smart router. It checks for an active session
// and directs users to the correct page.
export default function InitialRoutingPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This code will only run on the client side.
    const activeRole = localStorage.getItem('activeRole');
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    // Wait for Firebase auth to initialize
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (activeRole && user) {
        // If there's an active role and user is logged in, go to the respective dashboard
        const validRoles = ['customer', 'shopkeeper', 'owner'];
        if (validRoles.includes(activeRole)) {
          router.replace(`/${activeRole}/dashboard`);
        } else {
          // Invalid role, clear it and go to auth
          localStorage.removeItem('activeRole');
          router.replace('/auth');
        }
      } else if (hasSeenOnboarding) {
        // If no active role, but onboarding is seen, go to auth page
        router.replace('/auth');
      } else {
        // If this is their first visit, send them to the first intro page.
        router.replace('/intro/1');
      }
      // We set loading to false here in case redirection doesn't happen for some reason
      // but in most cases, the component will unmount before this is needed.
      setLoading(false);
    });

    return () => unsubscribe();
    
  }, [router, auth]);

  return (
    // Show a full-screen loader while we figure out where to go.
    <div className="loading-container">
      <div className="neu-spinner"></div>
    </div>
  );
}
