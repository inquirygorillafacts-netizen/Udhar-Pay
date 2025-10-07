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
  const [pinCheckData, setPinCheckData] = useState<{ role: string; correctPin: string; targetPath: string; } | null>(null);

  useEffect(() => {
    const activeRole = localStorage.getItem('activeRole');
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    // Check if this is the first navigation after login/registration
    const isPostLogin = sessionStorage.getItem('post_login_nav');

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && activeRole) {
        const validRoles = ['customer', 'shopkeeper', 'owner'];
        if (validRoles.includes(activeRole)) {
          try {
            const collectionName = activeRole === 'owner' ? 'owner_o2Vco2LqnvWsZijYtb4EDMNdOOC2' : `${activeRole}s`;
            const userDocRef = doc(firestore, collectionName, user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                let targetPath: string;
                if(isPostLogin) {
                    targetPath = `/${activeRole}/dashboard`;
                    sessionStorage.removeItem('post_login_nav'); // Clear the flag
                } else {
                    // Default navigation for subsequent visits
                    targetPath = activeRole === 'customer' ? '/customer/scan' : `/${activeRole}/dashboard`;
                }

                if (userDoc.data().pinEnabled && userDoc.data().pin) {
                    // User has a PIN lock enabled for the active role
                    setPinCheckData({ role: activeRole, correctPin: userDoc.data().pin, targetPath: targetPath });
                    setShowPinLock(true);
                    setLoading(false);
                } else {
                    // No PIN lock, redirect to the determined path
                    router.replace(targetPath);
                }
            } else {
                // User document for this role doesn't exist, something is wrong.
                localStorage.removeItem('activeRole');
                router.replace('/auth');
            }
          } catch (error) {
            console.error("Error checking for PIN:", error);
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
        const customerDoc = await getDoc(doc(firestore, 'customers', user.uid));
        if (customerDoc.exists()) {
            localStorage.setItem('activeRole', 'customer');
            sessionStorage.setItem('post_login_nav', 'true');
            router.replace('/customer/dashboard'); // First time always to dashboard
        } else {
            const shopkeeperDoc = await getDoc(doc(firestore, 'shopkeepers', user.uid));
             if (shopkeeperDoc.exists()) {
                localStorage.setItem('activeRole', 'shopkeeper');
                sessionStorage.setItem('post_login_nav', 'true');
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
      
      if (!showPinLock) {
         setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinSuccess = () => {
    if (pinCheckData) {
      router.replace(pinCheckData.targetPath);
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
