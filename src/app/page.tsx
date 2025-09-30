'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc } from 'firebase/firestore';
import PinLockScreen from '@/components/auth/PinLockScreen';

export default function InitialRoutingPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [showPinLock, setShowPinLock] = useState(false);
  const [pinCheckData, setPinCheckData] = useState<{ role: string; correctPin: string } | null>(null);

  useEffect(() => {
    const activeRole = localStorage.getItem('activeRole');
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (activeRole && user) {
        const validRoles = ['customer', 'shopkeeper', 'owner'];
        if (validRoles.includes(activeRole)) {
          try {
            const collectionName = `${activeRole}s`; // customer -> customers
            const userDocRef = doc(firestore, collectionName, user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().pinEnabled && userDoc.data().pin) {
              // User has a PIN lock enabled
              setPinCheckData({ role: activeRole, correctPin: userDoc.data().pin });
              setShowPinLock(true);
              setLoading(false);
            } else {
              // No PIN lock, redirect to dashboard
              router.replace(`/${activeRole}/dashboard`);
            }
          } catch (error) {
            console.error("Error checking for PIN:", error);
            // Fallback: if check fails, go to dashboard
            router.replace(`/${activeRole}/dashboard`);
          }
        } else {
          localStorage.removeItem('activeRole');
          router.replace('/auth');
        }
      } else if (hasSeenOnboarding) {
        router.replace('/auth');
      } else {
        router.replace('/intro/1');
      }
      // Only set loading to false here if not showing PIN lock
      if (!showPinLock) {
         setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinSuccess = () => {
    if (pinCheckData) {
      router.replace(`/${pinCheckData.role}/dashboard`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }
  
  if (showPinLock && pinCheckData) {
    return <PinLockScreen correctPin={pinCheckData.correctPin} onSuccess={handlePinSuccess} />;
  }

  // Fallback loader while redirecting
  return (
    <div className="loading-container">
      <div className="neu-spinner"></div>
    </div>
  );
}
