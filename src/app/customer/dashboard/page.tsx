'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import Link from 'next/link';
import { Paperclip, X, Wallet, User } from 'lucide-react';
import ShopkeeperCard from '@/app/customer/components/ShopkeeperCard';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  balances?: { [key: string]: number };
  connections?: string[];
  customerCode?: string;
}

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

export default function CustomerDashboardPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [shopkeeperCode, setShopkeeperCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [connectedShopkeepers, setConnectedShopkeepers] = useState<ShopkeeperProfile[]>([]);
  const [loadingShopkeepers, setLoadingShopkeepers] = useState(false);
  
  const totalBalance = userProfile?.balances ? Object.values(userProfile.balances).reduce((sum, bal) => sum + bal, 0) : 0;

  useEffect(() => {
    if (auth.currentUser) {
      const userRef = doc(firestore, 'customers', auth.currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const profile = { uid: auth.currentUser!.uid, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);

          if (profile.connections && profile.connections.length > 0) {
              setLoadingShopkeepers(true);
              const shopkeepersRef = collection(firestore, 'shopkeepers');
              const q = query(shopkeepersRef, where('__name__', 'in', profile.connections));
              getDocs(q)
                  .then(snapshot => {
                      const shopkeepers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopkeeperProfile));
                      setConnectedShopkeepers(shopkeepers);
                  })
                  .catch(error => console.error("Error fetching shopkeepers:", error))
                  .finally(() => setLoadingShopkeepers(false));
          } else {
              setConnectedShopkeepers([]);
          }
        }
        setLoading(false);
      }, (error) => {
          console.error("Error fetching user document:", error);
          setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [auth.currentUser, firestore]);

  const handleConnect = async () => {
    if (!firestore || !auth.currentUser || !userProfile) {
        setModalMessage('Could not connect. Please try again.');
        return;
    }
    if (shopkeeperCode.trim().length === 0) {
        setModalMessage('Please enter a shopkeeper code.');
        return;
    }

    setIsConnecting(true);
    try {
        const shopkeepersRef = collection(firestore, 'shopkeepers');
        const q = query(shopkeepersRef, where('shopkeeperCode', '==', shopkeeperCode.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setModalMessage('No shopkeeper found with this code. Please check the code and try again.');
            setIsConnecting(false);
            return;
        }

        const shopkeeperDoc = querySnapshot.docs[0];
        const shopkeeperId = shopkeeperDoc.id; // This is the shopkeeper's UID
        const shopkeeperName = shopkeeperDoc.data().displayName;

        if (userProfile.connections?.includes(shopkeeperId)) {
            setModalMessage(`You are already connected to ${shopkeeperName}.`);
            setIsConnecting(false);
            setShopkeeperCode('');
            return;
        }

        // Use the UID to establish the connection
        const customerRef = doc(firestore, 'customers', auth.currentUser.uid);
        await updateDoc(customerRef, {
            connections: arrayUnion(shopkeeperId)
        });
        
        setModalMessage(`Connection with ${shopkeeperName} successful!`);
        setShopkeeperCode('');

    } catch (error) {
        console.error("Error connecting to shopkeeper:", error);
        setModalMessage('An error occurred while sending the request. Please try again.');
    } finally {
        setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }

  if (!userProfile) {
     return (
      <main className="login-container">
        <div className="login-card">
          <h2>Error</h2>
          <p>Could not load user profile. Please try logging in again.</p>
           <button className="neu-button" onClick={() => auth.signOut()} style={{marginTop: '20px'}}>Sign Out</button>
        </div>
      </main>
    );
  }
  
  return (
    <>
        {modalMessage && (
            <div className="modal-overlay" onClick={() => setModalMessage('')}>
                <div className="login-card modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Notification</h2>
                        <button className="close-button" onClick={() => setModalMessage('')}><X size={24} /></button>
                    </div>
                    <p style={{ color: '#6c7293', textAlign: 'center', marginBottom: '30px' }}>
                        {modalMessage}
                    </p>
                    <button className="neu-button" style={{width: '100%', margin: 0}} onClick={() => setModalMessage('')}>
                        Close
                    </button>
                </div>
            </div>
        )}

        <header className="dashboard-header">
           <div className="user-menu">
            <Link href="/customer/profile">
                <div className="user-avatar neu-icon">
                    {userProfile.photoURL ? (
                        <img src={userProfile.photoURL} alt={userProfile.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                    ) : (
                        <User size={24} />
                    )}
                  </div>
              </Link>
          </div>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600', textAlign: 'center', flexGrow: 1}}>
            {userProfile.displayName}
          </h1>
        </header>
        
        <main className="dashboard-main-content">
            
            <div style={{display: 'flex', gap: '20px', maxWidth: '600px', margin: 'auto', marginBottom: '40px' }}>
                <div className="token-balance" style={{ flex: 1, flexDirection: 'column', padding: '15px', height: 'auto', gap: '2px' }}>
                    <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Your Code</span>
                    <span style={{fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px'}}>{userProfile?.customerCode || '...'}</span>
                </div>
                <div className="token-balance" style={{ flex: 1.5, flexDirection: 'column', padding: '15px', height: 'auto', gap: '2px' }}>
                    <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Total Udhaar</span>
                    <span style={{fontSize: '1.75rem'}}>₹{totalBalance}</span>
                </div>
            </div>


          <div className="login-card" style={{marginBottom: '40px', maxWidth: '600px', margin: 'auto' }}>
               <div>
                    <p style={{color: '#6c7293', marginBottom: '20px', textAlign: 'center'}}>
                        Connect to a Shopkeeper to manage credit.
                    </p>
                    <div className="form-group" style={{marginBottom: 0}}>
                        <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                            <input
                                type="text"
                                placeholder="Enter Shopkeeper's Code"
                                value={shopkeeperCode}
                                onChange={(e) => setShopkeeperCode(e.target.value.toUpperCase())}
                                style={{paddingLeft: '55px', textTransform: 'uppercase'}}
                            />
                            <div className="input-icon"><Paperclip /></div>
                             <button 
                                className={`neu-button ${isConnecting ? 'loading' : ''}`} 
                                style={{width: 'auto', margin: '8px', marginBottom: '8px', padding: '10px 20px', flexShrink: 0}}
                                onClick={handleConnect}
                                disabled={isConnecting}
                              >
                                <span className="btn-text">Connect</span>
                                <div className="btn-loader">
                                  <div className="neu-spinner"></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
          </div>

          {(loadingShopkeepers) ? (
            <div className="neu-spinner" style={{margin: '40px auto'}}></div>
          ) : (connectedShopkeepers.length > 0 && userProfile.balances) && (
              <div className="login-card" style={{maxWidth: '600px', margin: '40px auto'}}>
                   <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '30px' }}>
                      Your Connected Shopkeepers
                    </h2>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {connectedShopkeepers.map(shopkeeper => (
                            <Link key={shopkeeper.uid} href={`/customer/payment/${shopkeeper.uid}`}>
                              <ShopkeeperCard 
                                shopkeeper={shopkeeper}
                                balance={userProfile.balances?.[shopkeeper.uid] || 0}
                              />
                            </Link>
                          ))}
                      </div>
              </div>
          )}
        </main>
    </>
  );
}
