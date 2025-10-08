'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Paperclip, X, User, Check, AlertCircle, Send, IndianRupee, ArrowRight, Repeat, Bell, MessageSquare } from 'lucide-react';
import ShopkeeperCard from '@/app/customer/components/ShopkeeperCard';
import { sendConnectionRequest } from '@/lib/connections';
import RoleEnrollmentModal from '@/components/auth/RoleEnrollmentModal';


interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  connections?: string[];
  customerCode?: string;
}

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  defaultCreditLimit?: number;
  creditSettings?: { [key: string]: { limitType: 'default' | 'manual', manualLimit: number } };
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

interface Transaction {
    amount: number;
    type: 'credit' | 'payment' | 'commission';
    shopkeeperId: string;
}

interface OwnerMessage {
  id: string;
  text: string;
  updatedAt: Timestamp;
}

const COMMISSION_RATE = 0.025; // 2.5%


export default function CustomerDashboardPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  
  const [shopkeeperCode, setShopkeeperCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

  const [connectedShopkeepers, setConnectedShopkeepers] = useState<ShopkeeperProfile[]>([]);
  const [loadingShopkeepers, setLoadingShopkeepers] = useState(false);
  
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<CreditRequest | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  
  const [hasShopkeeperRole, setHasShopkeeperRole] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  const [ownerMessage, setOwnerMessage] = useState<OwnerMessage | null>(null);
  const [showNotificationSidebar, setShowNotificationSidebar] = useState(false);
  const [notificationViewCount, setNotificationViewCount] = useState(0);

  const totalBalance = Object.values(balances).reduce((sum, bal) => sum + (bal > 0 ? bal : 0), 0);

  useEffect(() => {
    if (!auth.currentUser || !firestore) return;

      const currentUserUid = auth.currentUser.uid;
      let unsubscribeTransactions: () => void = () => {};

      const userRef = doc(firestore, 'customers', currentUserUid);
      const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const profile = { uid: currentUserUid, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);

          const shopkeeperDoc = await getDoc(doc(firestore, 'shopkeepers', currentUserUid));
          setHasShopkeeperRole(shopkeeperDoc.exists());

          const connectedShopkeeperIds = profile.connections || [];
          if (connectedShopkeeperIds.length > 0) {
              setLoadingShopkeepers(true);
              const shopkeepersRef = collection(firestore, 'shopkeepers');
              const q = query(shopkeepersRef, where('__name__', 'in', connectedShopkeeperIds));
              getDocs(q)
                  .then(snapshot => {
                      const shopkeepers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopkeeperProfile));
                      setConnectedShopkeepers(shopkeepers);
                  })
                  .catch(error => console.error("Error fetching shopkeepers:", error))
                  .finally(() => setLoadingShopkeepers(false));
          } else {
              setConnectedShopkeepers([]);
              setBalances({});
          }

          // Listen for transactions to calculate balance
          unsubscribeTransactions(); // Unsubscribe from previous listener
          const transRef = collection(firestore, 'transactions');
          const transQuery = query(transRef, where('customerId', '==', currentUserUid));
          unsubscribeTransactions = onSnapshot(transQuery, (snapshot) => {
              const newBalances: { [key: string]: number } = {};
              connectedShopkeeperIds.forEach(id => newBalances[id] = 0); // Initialize all balances

              snapshot.forEach((doc) => {
                  const tx = doc.data() as Transaction;
                  if (newBalances[tx.shopkeeperId] !== undefined) {
                       // Correct balance calculation for customer view: commission is part of their debt
                      if (tx.type === 'credit' || tx.type === 'commission') {
                          newBalances[tx.shopkeeperId] += tx.amount;
                      } else if (tx.type === 'payment') {
                          newBalances[tx.shopkeeperId] -= tx.amount;
                      }
                  }
              });
              setBalances(newBalances);
          });

        }
        setLoading(false);
      }, (error) => {
          console.error("Error fetching user document:", error);
          setLoading(false);
      });
      
      const requestsRef = collection(firestore, 'creditRequests');
      const qRequests = query(
          requestsRef, 
          where('customerId', '==', currentUserUid), 
          where('status', '==', 'pending'),
          where('requestedBy', '==', 'shopkeeper')
      );
      
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
      
      const ownerMessageRef = doc(firestore, 'notifications', 'ownerMessage');
      const unsubscribeOwnerMessage = onSnapshot(ownerMessageRef, (docSnap) => {
        if(docSnap.exists()) {
            const messageData = { id: docSnap.id, ...docSnap.data() } as OwnerMessage;
            setOwnerMessage(messageData);

            const viewCountStr = localStorage.getItem(`notification_view_count_${messageData.updatedAt.toMillis()}`);
            const count = viewCountStr ? parseInt(viewCountStr, 10) : 0;
            
            setNotificationViewCount(count);

        } else {
            setOwnerMessage(null);
        }
      });

      return () => {
          unsubscribeUser();
          unsubscribeRequests();
          unsubscribeTransactions();
          unsubscribeOwnerMessage();
      }
  }, [auth.currentUser, firestore]);

  useEffect(() => {
    if (creditRequests.length > 0 && !activeRequest) {
        setActiveRequest(creditRequests[0]);
    } else if (creditRequests.length === 0) {
        setActiveRequest(null);
    }
  }, [creditRequests, activeRequest]);

  const handleRoleSwitchClick = () => {
    if (hasShopkeeperRole) {
        localStorage.setItem('activeRole', 'shopkeeper');
        router.push('/shopkeeper/dashboard');
    } else {
        setShowRoleModal(true);
    }
  };
  
  const handleOpenNotification = () => {
    setShowNotificationSidebar(true);
    
    // Only increment view count if it's a new or partially seen message
    if(ownerMessage && notificationViewCount < 2) {
      const newCount = notificationViewCount + 1;
      setNotificationViewCount(newCount);
      localStorage.setItem(`notification_view_count_${ownerMessage.updatedAt.toMillis()}`, newCount.toString());
    }
  }


  const handleCreditRequestResponse = async (request: CreditRequest, response: 'approved' | 'rejected') => {
      if (!auth.currentUser || !firestore || !userProfile) return;
      
      setIsProcessingRequest(true);

      try {
          const requestRef = doc(firestore, 'creditRequests', request.id);
          
          if (response === 'approved') {
              const batch = writeBatch(firestore);
              batch.update(requestRef, { status: 'approved' });
              
              const commissionAmount = request.amount * COMMISSION_RATE;
              const profitAmount = Math.round(commissionAmount * 100) / 100;

              // Main credit transaction
              const transactionRef = doc(collection(firestore, 'transactions'));
              batch.set(transactionRef, {
                  amount: request.amount,
                  type: 'credit',
                  notes: `Credit approved by customer`,
                  shopkeeperId: request.shopkeeperId,
                  customerId: auth.currentUser.uid,
                  timestamp: serverTimestamp(),
              });

              // Commission transaction for platform profit
              const commissionRef = doc(collection(firestore, 'transactions'));
               batch.set(commissionRef, {
                  amount: profitAmount,
                  type: 'commission',
                  notes: `2.5% commission on ₹${request.amount} credit`,
                  shopkeeperId: request.shopkeeperId,
                  customerId: auth.currentUser.uid,
                  timestamp: serverTimestamp(),
                  profit: profitAmount
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
        const result = await sendConnectionRequest(firestore, auth.currentUser.uid, shopkeeperCode, userProfile.displayName);
        
        if (result.status === 'already_connected' && result.shopkeeper) {
             const balance = balances[result.shopkeeper.id] || 0;
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
  
  const hasUnreadMessage = ownerMessage && notificationViewCount < 2;

  return (
    <>
    {showRoleModal && (
          <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
            <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{fontSize: '1.5rem'}}>Add Shopkeeper Role</h2>
                     <button className="close-button" onClick={() => setShowRoleModal(false)}>&times;</button>
                </div>
                <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px'}}>
                    You do not have a shopkeeper profile yet. To switch to the shopkeeper view, you first need to enroll.
                </p>
                <button className="neu-button" onClick={() => router.push('/customer/profile')} style={{margin: 0}}>
                    Go to Profile to Enroll
                </button>
            </div>
          </div>
        )}
        {activeRequest && (
            <div className="modal-overlay">
                <div className="login-card modal-content" onClick={(e) => e.stopPropagation()}>
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
                <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
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
        
        {showNotificationSidebar && (
             <div className="message-sidebar-overlay" onClick={() => setShowNotificationSidebar(false)}>
                <div className="message-sidebar" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 style={{fontSize: '1.5rem'}}>Message from Owner</h2>
                        <button className="close-button" onClick={() => setShowNotificationSidebar(false)}>&times;</button>
                    </div>
                    <div className="sidebar-content" style={{overflowY: 'auto', padding: '10px'}}>
                        {ownerMessage ? (
                            <p style={{color: '#6c7293', whiteSpace: 'pre-wrap', lineHeight: 1.7}}>
                                {ownerMessage.text}
                            </p>
                        ) : (
                            <p style={{textAlign: 'center', color: '#9499b7'}}>You have no new messages.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={handleRoleSwitchClick} className="neu-button" style={{width: '45px', height: '45px', margin: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <Repeat size={20}/>
            </button>
            <div className="login-card" style={{padding: '10px 20px', flexGrow: 1, margin: 0, textAlign: 'center'}}>
                <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>
                    {userProfile.displayName}
                </h1>
            </div>
            <button onClick={handleOpenNotification} className="neu-button" style={{width: '45px', height: '45px', margin: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'visible' }}>
                <Bell size={20}/>
                {hasUnreadMessage && <span style={{position: 'absolute', top: 5, right: 5, width: '20px', height: '20px', background: '#ff3b5c', borderRadius: '50%', border: '2px solid #e0e5ec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold'}}>1</span>}
            </button>
        </div>
        
        <main className="dashboard-main-content">
            
            <div style={{display: 'flex', gap: '20px', margin: '20px auto 40px auto', padding: '0 20px' }}>
                <div className="token-balance" style={{ flex: 1, flexDirection: 'column', padding: '15px', height: 'auto', gap: '2px' }}>
                    <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Your Code</span>
                    <span style={{fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px'}}>{userProfile?.customerCode || '...'}</span>
                </div>
                <div className="token-balance" style={{ flex: 1.5, flexDirection: 'column', padding: '15px', height: 'auto', gap: '2px' }}>
                    <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Total Udhaar</span>
                    <span style={{fontSize: '1.75rem'}}>₹{totalBalance}</span>
                </div>
            </div>

            <div style={{marginBottom: '40px', padding: '0 20px'}}>
                <div className="form-group" style={{marginBottom: 0}}>
                    <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                        <input
                            type="text"
                            placeholder="दुकानदार का कोड यहाँ डालें"
                            value={shopkeeperCode}
                            onChange={(e) => setShopkeeperCode(e.target.value)}
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

          {(loadingShopkeepers) ? (
            <div className="neu-spinner" style={{margin: '40px auto'}}></div>
          ) : (connectedShopkeepers.length > 0) && (
              <div style={{margin: '40px auto', padding: '0 20px'}}>
                   <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '30px' }}>
                      Your Connected Shopkeepers
                    </h2>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {connectedShopkeepers.map(shopkeeper => (
                            <ShopkeeperCard 
                                key={shopkeeper.uid}
                                shopkeeper={shopkeeper}
                                balance={balances[shopkeeper.uid] || 0}
                                customerId={userProfile.uid}
                            />
                          ))}
                      </div>
              </div>
          )}
        </main>
    </>
  );
}

    

    
