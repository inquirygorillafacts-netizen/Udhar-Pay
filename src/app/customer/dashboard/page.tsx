'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Paperclip, X, User, Check, AlertCircle, Send, IndianRupee, ArrowRight } from 'lucide-react';
import ShopkeeperCard from '@/app/customer/components/ShopkeeperCard';
import { sendConnectionRequest } from '@/lib/connections';

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

interface CreditRequest {
    id: string;
    shopkeeperId: string;
    shopkeeperName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
}

interface ModalInfo {
    type: 'success' | 'info' | 'already_connected';
    title: string;
    message: string;
    data?: any;
}


export default function CustomerDashboardPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [shopkeeperCode, setShopkeeperCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

  const [connectedShopkeepers, setConnectedShopkeepers] = useState<ShopkeeperProfile[]>([]);
  const [loadingShopkeepers, setLoadingShopkeepers] = useState(false);
  
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<CreditRequest | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  
  const totalBalance = userProfile?.balances ? Object.values(userProfile.balances).reduce((sum, bal) => sum + bal, 0) : 0;

  useEffect(() => {
    if (!auth.currentUser || !firestore) return;

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
      
      const requestsRef = collection(firestore, 'creditRequests');
      const qRequests = query(requestsRef, where('customerId', '==', auth.currentUser.uid), where('status', '==', 'pending'));
      
      const unsubscribeRequests = onSnapshot(qRequests, async (snapshot) => {
          const requests: CreditRequest[] = [];
          for (const doc of snapshot.docs) {
              const requestData = doc.data();
              if(!requestData.shopkeeperName) {
                  try {
                    const shopkeeperDoc = await getDoc(doc(firestore, 'shopkeepers', requestData.shopkeeperId));
                    requestData.shopkeeperName = shopkeeperDoc.data()?.displayName || 'A Shopkeeper';
                  } catch (e) {
                     requestData.shopkeeperName = 'A Shopkeeper';
                  }
              }
              requests.push({ id: doc.id, ...requestData } as CreditRequest);
          }
          setCreditRequests(requests);
      });

      return () => {
          unsubscribe();
          unsubscribeRequests();
      }
  }, [auth.currentUser, firestore]);

  useEffect(() => {
    if (creditRequests.length > 0 && !activeRequest) {
        setActiveRequest(creditRequests[0]);
    } else if (creditRequests.length === 0) {
        setActiveRequest(null);
    }
  }, [creditRequests, activeRequest]);

  const handleCreditRequestResponse = async (request: CreditRequest, response: 'approved' | 'rejected') => {
      if (!auth.currentUser || !firestore || !userProfile) return;
      
      setIsProcessingRequest(true);

      try {
          const requestRef = doc(firestore, 'creditRequests', request.id);
          
          if (response === 'approved') {
              const batch = writeBatch(firestore);

              // Update the request status
              batch.update(requestRef, { status: 'approved' });

              // Update balances
              const balanceChange = request.amount;
              const shopkeeperRef = doc(firestore, 'shopkeepers', request.shopkeeperId);
              const customerRef = doc(firestore, 'customers', auth.currentUser.uid);

              const shopkeeperDoc = await getDoc(shopkeeperRef);
              const shopkeeperBalances = shopkeeperDoc.data()?.balances || {};
              const newShopkeeperBalance = (shopkeeperBalances[userProfile.uid] || 0) + balanceChange;

              const customerBalances = userProfile.balances || {};
              const newCustomerBalance = (customerBalances[request.shopkeeperId] || 0) + balanceChange;
              
              batch.set(shopkeeperRef, { balances: { [userProfile.uid]: newShopkeeperBalance } }, { merge: true });
              batch.set(customerRef, { balances: { [request.shopkeeperId]: newCustomerBalance } }, { merge: true });

              // Create transaction record
              const transactionRef = doc(collection(firestore, 'transactions'));
              batch.set(transactionRef, {
                  amount: request.amount,
                  type: 'credit',
                  notes: `Credit approved by customer`,
                  shopkeeperId: request.shopkeeperId,
                  customerId: auth.currentUser.uid,
                  timestamp: serverTimestamp(),
              });
              
              await batch.commit();

          } else { // Rejected
              await updateDoc(requestRef, { status: 'rejected' });
          }

      } catch (error) {
          console.error("Error responding to credit request:", error);
          setModalInfo({
              type: 'info',
              title: "Error",
              message: "An error occurred. Please try again."
          });
      } finally {
        setIsProcessingRequest(false);
        setActiveRequest(null);
      }
  }


  const handleConnect = async () => {
    if (!firestore || !auth.currentUser || !userProfile) {
        setModalInfo({ type: 'info', title: 'Error', message: 'Could not connect. Please try again.' });
        return;
    }
    if (shopkeeperCode.trim().length === 0) {
        setModalInfo({ type: 'info', title: 'Input Error', message: 'Please enter a shopkeeper code.' });
        return;
    }

    setIsConnecting(true);
    try {
        const result = await sendConnectionRequest(firestore, auth.currentUser.uid, shopkeeperCode.toUpperCase(), userProfile.displayName);
        
        if (result.status === 'already_connected' && result.shopkeeper) {
             const balance = userProfile.balances?.[result.shopkeeper.id] || 0;
             setModalInfo({
                type: 'already_connected',
                title: 'Already Connected',
                message: `You are already connected to ${result.shopkeeper.name}.`,
                data: { ...result.shopkeeper, balance }
            });
        } else {
            setModalInfo({ type: 'success', title: 'Request Sent', message: `Connection request sent! You will be notified upon approval.` });
        }
        setShopkeeperCode('');

    } catch (error: any) {
        console.error("Error connecting to shopkeeper:", error);
        setModalInfo({ type: 'info', title: 'Connection Error', message: error.message || 'An error occurred while sending the request.' });
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
        {activeRequest && (
            <div className="modal-overlay">
                <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center'}}>
                         <div className="neu-icon" style={{width: '70px', height: '70px', background: '#00c896', color: 'white', marginBottom: '20px'}}>
                            <Send size={30} />
                        </div>
                        <h2 style={{fontSize: '1.5rem'}}>Credit Request</h2>
                        <p style={{color: '#6c7293', marginTop: '10px'}}>
                            <strong>{activeRequest.shopkeeperName}</strong> sent you a credit request for <strong style={{color: '#3d4468', fontSize: '1.2rem'}}>₹{activeRequest.amount}</strong>.
                        </p>
                    </div>
                     <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                        <button className={`neu-button ${isProcessingRequest ? 'loading' : ''}`} onClick={() => handleCreditRequestResponse(activeRequest, 'rejected')} disabled={isProcessingRequest} style={{ margin: 0, flex: 1, background: '#ff3b5c', color: 'white' }}>
                            <span className="btn-text">Reject</span>
                            <div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                        <button className={`neu-button ${isProcessingRequest ? 'loading' : ''}`} onClick={() => handleCreditRequestResponse(activeRequest, 'approved')} disabled={isProcessingRequest} style={{ margin: 0, flex: 1, background: '#00c896', color: 'white' }}>
                            <span className="btn-text">Approve</span>
                            <div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {modalInfo && (
            <div className="modal-overlay" onClick={() => setModalInfo(null)}>
                <div className="login-card modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>{modalInfo.title}</h2>
                        <button className="close-button" onClick={() => setModalInfo(null)}><X size={24} /></button>
                    </div>
                    <p style={{ color: '#6c7293', textAlign: 'center', marginBottom: '30px' }}>
                        {modalInfo.message}
                    </p>
                    {modalInfo.type === 'already_connected' && modalInfo.data && (
                        <div style={{textAlign: 'center', marginBottom: '30px'}}>
                             <p style={{fontSize: '1.5rem', fontWeight: 'bold', margin: '5px 0', color: modalInfo.data.balance > 0 ? '#ff3b5c' : '#00c896'}}>
                                ₹{Math.abs(modalInfo.data.balance)}
                             </p>
                             <p style={{fontSize: '0.9rem', color: '#6c7293', margin: 0, fontWeight: 500}}>Current Balance</p>
                            <Link href={`/customer/payment/${modalInfo.data.id}`}>
                                <button className="neu-button" style={{marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                    Go to Transactions <ArrowRight size={18}/>
                                </button>
                            </Link>
                        </div>
                    )}
                    <button className="neu-button" style={{width: '100%', margin: 0}} onClick={() => setModalInfo(null)}>
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
          ) : (connectedShopkeepers.length > 0) && (
              <div className="login-card" style={{maxWidth: '600px', margin: '40px auto'}}>
                   <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '30px' }}>
                      Your Connected Shopkeepers
                    </h2>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {connectedShopkeepers.map(shopkeeper => (
                            <Link key={shopkeeper.uid} href={`/customer/payment/${shopkeeper.uid}`} legacyBehavior>
                              <a style={{textDecoration: 'none'}}>
                                <ShopkeeperCard 
                                  shopkeeper={shopkeeper}
                                  balance={userProfile.balances?.[shopkeeper.uid] || 0}
                                />
                              </a>
                            </Link>
                          ))}
                      </div>
              </div>
          )}
        </main>
    </>
  );
}
