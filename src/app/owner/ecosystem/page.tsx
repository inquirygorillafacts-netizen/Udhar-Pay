'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Network, ChevronRight, User, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Shopkeeper {
  uid: string;
  displayName: string;
  photoURL?: string;
  pendingSettlement: number;
  shopkeeperCode?: string;
}

export default function EcosystemPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  
  const [allShopkeepers, setAllShopkeepers] = useState<Shopkeeper[]>([]);
  const [filteredShopkeepers, setFilteredShopkeepers] = useState<Shopkeeper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
          shopkeeperCode: data.shopkeeperCode
        });
      });
      setAllShopkeepers(shopkeeperList);
      setFilteredShopkeepers(shopkeeperList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shopkeepers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredShopkeepers(allShopkeepers);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = allShopkeepers.filter(shopkeeper =>
        shopkeeper.displayName.toLowerCase().includes(lowercasedFilter) ||
        shopkeeper.shopkeeperCode?.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredShopkeepers(filtered);
    }
  }, [searchTerm, allShopkeepers]);

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
        
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto', marginBottom: '30px' }}>
             <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
                    <div className="neu-input">
                    <input
                        type="text"
                        id="search"
                        placeholder=" "
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <label htmlFor="search">Search by Name or Code</label>
                    <div className="input-icon"><Search /></div>
                    </div>
                </div>
                <div className="token-balance" style={{ margin: 0, padding: '10px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{allShopkeepers.length}</span>
                    </div>
                     <span style={{ fontSize: '12px', color: '#6c7293', fontWeight: 500, marginTop: '2px' }}>Shopkeepers</span>
                </div>
            </div>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="neu-spinner"></div>
            <p style={{ marginTop: '20px', color: '#6c7293' }}>Loading Shopkeepers...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {allShopkeepers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9499b7' }}>No shopkeepers found on the platform yet.</p>
            ) : filteredShopkeepers.length > 0 ? (
              filteredShopkeepers.map(shopkeeper => (
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
                <p style={{ textAlign: 'center', color: '#9499b7' }}>No shopkeeper found matching your search.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
