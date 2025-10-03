
'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { collection, onSnapshot } from 'firebase/firestore';
import { Network, ChevronRight, User, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Shopkeeper {
  uid: string;
  displayName: string;
  photoURL?: string;
  pendingSettlement: number;
}

export default function EcosystemPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const shopkeepersRef = collection(firestore, 'shopkeepers');
    const unsubscribe = onSnapshot(shopkeepersRef, (snapshot) => {
      const shopkeeperList: Shopkeeper[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        shopkeeperList.push({
          uid: doc.id,
          displayName: data.displayName || 'Unnamed Shopkeeper',
          photoURL: data.photoURL,
          pendingSettlement: data.pendingSettlement || 0,
        });
      });
      setShopkeepers(shopkeeperList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shopkeepers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const navigateToShopkeeperDetails = (shopkeeperId: string) => {
    router.push(`/owner/shopkeeper/${shopkeeperId}`);
  };

  return (
    <main className="dashboard-main-content" style={{ padding: '20px' }}>
      <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
        <div className="login-header" style={{ marginBottom: '40px' }}>
          <div className="neu-icon" style={{ width: '70px', height: '70px' }}>
            <div className="icon-inner"><Network /></div>
          </div>
          <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
            Platform Ecosystem
          </h1>
          <p style={{ color: '#6c7293', marginTop: '1rem' }}>
            Monitor all shopkeepers and their pending settlements.
          </p>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="neu-spinner"></div>
            <p style={{ marginTop: '20px', color: '#6c7293' }}>Loading Shopkeepers...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {shopkeepers.length > 0 ? (
              shopkeepers.map(shopkeeper => (
                <div
                  key={shopkeeper.uid}
                  className="neu-input"
                  onClick={() => navigateToShopkeeperDetails(shopkeeper.uid)}
                  style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '5px 5px 15px #bec3cf, -5px -5px 15px #ffffff' }}
                >
                  <div className="neu-icon" style={{ width: '50px', height: '50px', margin: '0 15px 0 0' }}>
                    {shopkeeper.photoURL ? (
                      <Image src={shopkeeper.photoURL} alt={shopkeeper.displayName} width={50} height={50} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#3d4468', fontWeight: 600, margin: 0 }}>{shopkeeper.displayName}</h3>
                    <p style={{ color: '#6c7293', fontSize: '14px', margin: '2px 0 0 0' }}>
                      Pending: <span style={{ fontWeight: 'bold', color: shopkeeper.pendingSettlement > 0 ? '#ff3b5c' : '#00c896' }}>₹{shopkeeper.pendingSettlement}</span>
                    </p>
                  </div>
                  <ChevronRight size={24} style={{ color: '#9499b7' }} />
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#9499b7' }}>No shopkeepers found on the platform yet.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
