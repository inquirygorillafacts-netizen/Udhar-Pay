'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc } from 'firebase/firestore';
import { User, Copy } from 'lucide-react';
import Link from 'next/link';

export default function ShopkeeperDashboardPage() {
  const { auth, firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [shopkeeperProfile, setShopkeeperProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser || !firestore) {
      setLoading(false);
      return;
    }

    const fetchShopkeeperProfile = async () => {
      try {
        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        const shopkeeperSnap = await getDoc(shopkeeperRef);

        if (shopkeeperSnap.exists()) {
          const shopkeeperData = shopkeeperSnap.data();
          setShopkeeperProfile({uid: auth.currentUser.uid, ...shopkeeperData});
        }
      } catch (error) {
        console.error("Error fetching shopkeeper data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopkeeperProfile();
  }, [auth.currentUser, firestore]);

  const copyToClipboard = () => {
    if (shopkeeperProfile?.shopkeeperCode) {
      navigator.clipboard.writeText(shopkeeperProfile.shopkeeperCode);
      alert('Shopkeeper code copied to clipboard!');
    }
  };

  if (loading) {
      return (
        <div className="loading-container">
            <div className="neu-spinner"></div>
        </div>
      )
  }

  return (
     <>
        <header className="dashboard-header">
           <div className="user-menu">
            <Link href="/shopkeeper/profile">
                <div className="user-avatar neu-icon">
                    {shopkeeperProfile?.photoURL ? (
                        <img src={shopkeeperProfile.photoURL} alt={shopkeeperProfile.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                    ) : (
                        <User size={24} />
                    )}
                  </div>
              </Link>
          </div>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600', textAlign: 'center', flexGrow: 1}}>
            {shopkeeperProfile?.displayName || 'Shopkeeper'}
          </h1>
        </header>

        <main className="dashboard-main-content">
             <div className="login-card" style={{maxWidth: '600px', margin: '40px auto', textAlign: 'center'}}>
                <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', marginBottom: '15px'}}>Your Shop Code</h2>
                <p style={{color: '#9499b7', marginBottom: '30px'}}>Share this code with customers to connect with them.</p>
                <div 
                    className="token-balance" 
                    style={{padding: '15px', height: 'auto', flexDirection: 'row', gap: '15px', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'}}
                    onClick={copyToClipboard}
                >
                    <span style={{fontSize: '1.75rem', fontWeight: 'bold', letterSpacing: '2px'}}>{shopkeeperProfile?.shopkeeperCode || '...'}</span>
                    <Copy size={20} style={{color: '#6c7293'}}/>
                </div>
            </div>
        </main>
    </>
  );
}
