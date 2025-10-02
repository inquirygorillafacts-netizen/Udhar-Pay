'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { MessageSquare, X, Check, Wallet, ShieldAlert, Users, BookUser, Banknote, User, Search, ArrowLeft, ArrowRight, QrCode, Share2 } from 'lucide-react';
import { acceptConnectionRequest, rejectConnectionRequest } from '@/lib/connections';
import CustomerCard from '@/app/shopkeeper/components/CustomerCard';
import QRCode from "react-qr-code";


interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  balances?: { [key: string]: number };
  connections?: string[];
  shopkeeperCode?: string;
}

interface ConnectionRequest {
  id: string;
  customerId: string;
  customerName: string;
  shopkeeperId: string;
  status: string;
}

// Redefined for this page's context
interface CustomerForSelection extends UserProfile {
    balance: number;
}

export default function ShopkeeperDashboardPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  
  const [shopkeeperProfile, setShopkeeperProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isMessageSidebarOpen, setIsMessageSidebarOpen] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  
  // --- Give Credit State ---
  const [step, setStep] = useState('enterAmount'); // enterAmount, selectCustomer, success
  const [customers, setCustomers] = useState<CustomerForSelection[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerForSelection[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerForSelection | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [isRequestingCredit, setIsRequestingCredit] = useState(false);
  const [error, setError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!auth.currentUser) {
        setLoadingProfile(false);
        return;
    };

    if (firestore && auth.currentUser) {
      // Fetch user profile
      const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
      const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          setShopkeeperProfile(profile);

          // Fetch connected customers
          const customerIds = profile.connections || [];
          if (customerIds.length > 0) {
            setLoadingCustomers(true);
            const customersQuery = query(collection(firestore, 'customers'), where('__name__', 'in', customerIds));
            const customersSnap = await getDocs(customersQuery);
            const customerProfiles = customersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            
            const customersWithBalance = customerProfiles.map(cust => ({
                ...cust,
                balance: profile.balances?.[cust.uid] || 0
            })) as CustomerForSelection[];

            setCustomers(customersWithBalance);
            setFilteredCustomers(customersWithBalance);
            setLoadingCustomers(false);
          } else {
            setCustomers([]);
            setFilteredCustomers([]);
            setLoadingCustomers(false);
          }

        }
        setLoadingProfile(false);
      }, (error) => {
          console.error("Error fetching user document:", error);
          setLoadingProfile(false);
      });

      // Fetch connection requests
      const requestsRef = collection(firestore, 'connectionRequests');
      const qConnections = query(requestsRef, where('shopkeeperId', '==', auth.currentUser.uid), where('status', '==', 'pending'));
      
      const unsubscribeConnections = onSnapshot(qConnections, (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectionRequest));
        setConnectionRequests(requests);
      }, (error) => {
        console.error("Error fetching connection requests:", error);
      });

      return () => {
        unsubscribeProfile();
        unsubscribeConnections();
      };
    }
  }, [auth.currentUser, firestore, router]);

  // Effect for filtering customers
  useEffect(() => {
    if (customerSearchTerm === '') {
        setFilteredCustomers(customers);
    } else {
        const lowercasedFilter = customerSearchTerm.toLowerCase();
        const filtered = customers.filter(customer =>
            customer.displayName.toLowerCase().includes(lowercasedFilter) ||
            customer.customerCode?.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredCustomers(filtered);
    }
  }, [customerSearchTerm, customers]);


  const handleAccept = async (requestId: string, customerId: string, shopkeeperId: string) => {
      if (!firestore) return;
      try {
          await acceptConnectionRequest(firestore, { requestId, customerId, shopkeeperId });
      } catch (error) {
          console.error("Error accepting request:", error);
          alert("Failed to accept request.");
      }
  };

  const handleReject = async (requestId: string) => {
      if (!firestore) return;
      try {
          await rejectConnectionRequest(firestore, requestId);
      } catch (error) {
          console.error("Error rejecting request:", error);
          alert("Failed to reject request.");
      }
  };

  const handleShareCode = async () => {
    if (!qrCodeRef.current || !shopkeeperProfile?.shopkeeperCode) return;

    // Convert SVG to PNG
    const svgElement = qrCodeRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
            if (blob && navigator.share) {
                const file = new File([blob], 'qrcode.png', { type: 'image/png' });
                try {
                    await navigator.share({
                        title: 'My Shopkeeper Code',
                        text: `Connect with me on Udhar Pay! My code is: ${shopkeeperProfile.shopkeeperCode}`,
                        files: [file],
                    });
                } catch (error) {
                    console.log('Error sharing', error);
                }
            } else {
                 navigator.clipboard.writeText(shopkeeperProfile.shopkeeperCode || '');
                 alert('Shopkeeper code copied to clipboard! (Image sharing not supported on this browser)');
            }
        }, 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };


  // --- Give Credit Functions ---
  const handleKeyPress = (key: string) => {
    if (creditAmount.length >= 7) return;
    if (key === '.' && creditAmount.includes('.')) return;
    setCreditAmount(prev => prev + key);
    setError('');
  };

  const handleBackspace = () => {
      setCreditAmount(prev => prev.slice(0, -1));
  };

  const proceedToCustomerSelection = () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
        setError("Please enter a valid amount to give credit.");
        return;
    }
    setStep('selectCustomer');
    setError('');
  }

  const handleSendRequest = async (customer: CustomerForSelection) => {
      setSelectedCustomer(customer); // for success message
      const amount = parseFloat(creditAmount);
      if (isNaN(amount) || amount <= 0 || !shopkeeperProfile || !firestore) {
          setError("An unexpected error occurred. Please start over.");
          return;
      }
      
      setIsRequestingCredit(true); // Should disable all customer cards
      setError('');

      try {
          // This would ideally be a cloud function, but for now, we do it on the client
          const batch = writeBatch(firestore);

          const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperProfile.uid);
          const customerRef = doc(firestore, 'customers', customer.uid);

          const newShopkeeperBalance = (shopkeeperProfile.balances?.[customer.uid] || 0) + amount;
          const newCustomerBalance = (customer.balances?.[shopkeeperProfile.uid] || 0) + amount;

          batch.set(shopkeeperRef, { balances: { [customer.uid]: newShopkeeperBalance } }, { merge: true });
          batch.set(customerRef, { balances: { [shopkeeperProfile.uid]: newCustomerBalance } }, { merge: true });
          
          const transactionRef = doc(collection(firestore, 'transactions'));
          batch.set(transactionRef, {
              amount,
              type: 'credit',
              notes: 'Credit added by shopkeeper',
              shopkeeperId: shopkeeperProfile.uid,
              customerId: customer.uid,
              timestamp: new Date(),
          });

          await batch.commit();
          setStep('success');
      } catch (error) {
          console.error(error);
          // Show error on the customer selection screen
          setError("Failed to send request. Please try again.");
      } finally {
          setIsRequestingCredit(false);
      }
  }
  
  const resetCreditFlow = () => {
      setStep('enterAmount');
      setSelectedCustomer(null);
      setCreditAmount('');
      setError('');
      setIsRequestingCredit(false);
  }

  // --- Render Functions ---

  const renderEnterAmount = () => {
    return (
        <div className="login-card" style={{ maxWidth: '500px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '20px'}}>
                <h2>Give Credit (Udhaar)</h2>
            </div>
            
            <div className="neu-input" style={{ marginBottom: '20px', textAlign: 'center', fontSize: '2.5rem', fontWeight: '700', color: '#3d4468', padding: '15px' }}>
                ₹ {creditAmount || '0'}
            </div>

            {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px', animation: 'gentleShake 0.5s' }}>{error}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(key => (
                <button key={key} className="neu-button" onClick={() => handleKeyPress(key)} style={{ margin: 0, height: '60px' }}>{key}</button>
                ))}
                <button className="neu-button" onClick={handleBackspace} style={{ margin: 0, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24}/></button>
            </div>
            
            <button 
                className="neu-button"
                onClick={proceedToCustomerSelection}
                disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                style={{ background: '#00c896', color: 'white', width: '100%', margin: 0 }}
            >
                Next: Select Customer <ArrowRight style={{display: 'inline', marginLeft: '8px'}} size={20}/>
            </button>
        </div>
    );
  };

  const renderSelectCustomer = () => (
    <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
            <button className="neu-button" onClick={() => setStep('enterAmount')} style={{width: '50px', height: '50px', margin: 0, padding: 0}}>
                <ArrowLeft/>
            </button>
            <div>
                <p style={{ color: '#6c7293', margin: 0, fontSize: '14px'}}>Amount to give:</p>
                <h2 style={{color: '#3d4468', fontSize: '1.5rem', margin: 0}}>₹{parseFloat(creditAmount)}</h2>
            </div>
        </div>
        
        {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

        <div className="form-group" style={{ margin: 'auto', marginBottom: '30px', alignItems: 'center' }}>
            <div className="neu-input">
                <input
                    type="text"
                    id="search"
                    placeholder=" "
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                />
                <label htmlFor="search">Search Customer by Name or Code</label>
                <div className="input-icon"><Search /></div>
            </div>
        </div>
        
        {loadingCustomers ? (
            <div className="loading-container" style={{minHeight: '200px', background: 'transparent'}}>
                <div className="neu-spinner"></div>
                <p style={{marginTop: '20px', color: '#6c7293'}}>Loading customers...</p>
            </div>
        ) : customers.length === 0 ? (
            <p style={{ color: '#6c7293', textAlign: 'center', marginTop: '1rem' }}>
                You have not connected with any customers yet.
            </p>
        ) : filteredCustomers.length === 0 ? (
            <p style={{ color: '#6c7293', textAlign: 'center', marginTop: '1rem' }}>
                No customers found matching your search.
            </p>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredCustomers.map(customer => (
                    <div 
                        key={customer.uid} 
                        onClick={() => !isRequestingCredit && handleSendRequest(customer)}
                        style={{pointerEvents: isRequestingCredit ? 'none' : 'auto', opacity: isRequestingCredit ? 0.5 : 1}}
                    >
                        <CustomerCard customer={customer} shopkeeperId={auth.currentUser!.uid} />
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  const renderSuccess = () => {
    if (!selectedCustomer) return null;
    return (
        <div className="login-card" style={{ maxWidth: '450px', margin: 'auto', textAlign: 'center' }}>
            <div className="neu-icon" style={{background: '#00c896', color: 'white', boxShadow: '8px 8px 20px #b0f0df, -8px -8px 20px #ffffff', marginBottom: '30px', width: '100px', height: '100px'}}>
                <Check size={50} />
            </div>
            <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '15px'}}>Credit Added!</h2>
            <p style={{color: '#6c7293', marginBottom: '30px', fontSize: '1.1rem'}}>
                <strong>₹{parseFloat(creditAmount)}</strong> has been successfully added to <strong>{selectedCustomer.displayName}</strong>'s account.
            </p>
            <button className="neu-button" onClick={resetCreditFlow} style={{margin: 0}}>
                Give More Credit
            </button>
        </div>
    );
  };

  const renderMainContent = () => {
      switch (step) {
          case 'selectCustomer':
              return renderSelectCustomer();
          case 'success':
              return renderSuccess();
          case 'enterAmount':
          default:
              return renderEnterAmount();
      }
  }

  if (loadingProfile) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }
  
  return (
    <>
    <header className="dashboard-header">
        <div className="user-menu">
        <Link href="/shopkeeper/profile">
            <div className="user-avatar neu-icon">
                {shopkeeperProfile?.photoURL ? (
                    <img src={shopkeeperProfile.photoURL} alt={shopkeeperProfile.displayName || ''} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                ) : (
                    <User size={24} />
                )}
                </div>
            </Link>
        </div>
        <div 
            className="token-balance" 
            style={{padding: '10px 15px', height: 'auto', flexDirection: 'row', gap: '10px', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexGrow: 1, margin: '0 10px'}}
            onClick={() => setShowQrModal(true)}
        >
            <span style={{fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px'}}>{shopkeeperProfile?.shopkeeperCode || '...'}</span>
            <QrCode size={16} style={{color: '#6c7293'}}/>
        </div>
        <button 
            className="neu-button" 
            style={{width: '45px', height: '45px', margin: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible', flexShrink: 0}}
            onClick={() => setIsMessageSidebarOpen(true)}
        >
            <MessageSquare size={20} />
            {connectionRequests.length > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff3b5c', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {connectionRequests.length}
            </span>
            )}
        </button>
    </header>
        
      <main className="dashboard-main-content" style={{paddingTop: '20px'}}>
          {renderMainContent()}
      </main>

    {isMessageSidebarOpen && (
      <div className="message-sidebar-overlay" onClick={() => setIsMessageSidebarOpen(false)}>
        <div className="message-sidebar" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
              <h2>Connection Requests</h2>
              <button className="close-button" onClick={() => setIsMessageSidebarOpen(false)}>&times;</button>
          </div>
          <div className="sidebar-content" style={{overflowY: 'auto', padding: '10px'}}>
            {connectionRequests.length === 0 ? (
                <p style={{color: '#6c7293', textAlign: 'center'}}>
                    You have no new connection requests.
                </p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {connectionRequests.map(req => (
                        <li key={req.id} style={{ background: '#e0e5ec', padding: '15px', borderRadius: '15px', boxShadow: '5px 5px 10px #bec3cf, -5px -5px 10px #ffffff' }}>
                            <p style={{ color: '#3d4468', fontWeight: '600', marginBottom: '10px' }}>
                                {req.customerName} wants to connect.
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button className="neu-button" onClick={() => handleReject(req.id)} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#e0e5ec', color: '#ff3b5c' }}>
                                    Reject
                                </button>
                                <button className="neu-button" onClick={() => handleAccept(req.id, req.customerId, req.shopkeeperId)} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#00c896', color: 'white' }}>
                                    Accept
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
          </div>
        </div>
      </div>
    )}

    {showQrModal && shopkeeperProfile && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="login-card modal-content" style={{maxWidth: '420px', textAlign: 'center'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <h2 style={{fontSize: '1.5rem'}}>{shopkeeperProfile.displayName}'s Code</h2>
                  <button className="close-button" onClick={() => setShowQrModal(false)}>&times;</button>
              </div>
              <p style={{color: '#9499b7', marginBottom: '25px'}}>Show this QR to your customers to let them connect with you.</p>

              <div ref={qrCodeRef} style={{background: 'white', padding: '20px', borderRadius: '20px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', marginBottom: '25px'}}>
                {shopkeeperProfile.shopkeeperCode ? (
                    <QRCode
                        value={shopkeeperProfile.shopkeeperCode}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                ) : (
                    <p>No code generated yet.</p>
                )}
              </div>
              
              <p style={{color: '#3d4468', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '2px'}}>{shopkeeperProfile.shopkeeperCode}</p>

              <button className="neu-button" onClick={handleShareCode} style={{margin: '25px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                  <Share2 size={20}/> Share Code
              </button>
          </div>
        </div>
      )}
    </>
  );
}
