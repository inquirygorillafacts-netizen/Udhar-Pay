'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
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
      if (user && activeRole) {
        const validRoles = ['customer', 'shopkeeper', 'owner'];
        if (validRoles.includes(activeRole)) {
          try {
            const collectionName = activeRole === 'owner' ? 'owner_o2Vco2LqnvWsZijYtb4EDMNdOOC2' : `${activeRole}s`;
            const userDocRef = doc(firestore, collectionName, user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                if (userDoc.data().pinEnabled && userDoc.data().pin) {
                    // User has a PIN lock enabled for the active role
                    setPinCheckData({ role: activeRole, correctPin: userDoc.data().pin });
                    setShowPinLock(true);
                    setLoading(false);
                } else {
                    // No PIN lock, redirect to dashboard
                    router.replace(`/${activeRole}/dashboard`);
                }
            } else {
                // User document for this role doesn't exist, something is wrong.
                // Clear the bad role and send to auth.
                localStorage.removeItem('activeRole');
                router.replace('/auth');
            }
          } catch (error) {
            console.error("Error checking for PIN:", error);
            // Fallback: if check fails, go to dashboard but clear role first to be safe
            localStorage.removeItem('activeRole');
            router.replace('/auth');
          }
        } else {
          // Invalid role in storage
          localStorage.removeItem('activeRole');
          router.replace('/auth');
        }
      } else if (user) {
        // User is logged in but has no active role selected.
        // This can happen on first login on a new device.
        // We'll default them to the customer role if they are one, otherwise shopkeeper, else auth.
        const customerDoc = await getDoc(doc(firestore, 'customers', user.uid));
        if (customerDoc.exists()) {
            localStorage.setItem('activeRole', 'customer');
            router.replace('/customer/dashboard');
        } else {
            const shopkeeperDoc = await getDoc(doc(firestore, 'shopkeepers', user.uid));
             if (shopkeeperDoc.exists()) {
                localStorage.setItem('activeRole', 'shopkeeper');
                router.replace('/shopkeeper/dashboard');
             } else {
                 router.replace('/auth');
             }
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
