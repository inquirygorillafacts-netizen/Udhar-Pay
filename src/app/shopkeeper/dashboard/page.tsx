'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, DocumentData } from 'firebase/firestore';
import Link from 'next/link';
import { MessageSquare, X, Check, ArrowLeft, ArrowRight, QrCode, Share2, RefreshCw, User as UsersIcon, CheckCircle, XCircle } from 'lucide-react';
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
  customerCode?: string;
}

interface ConnectionRequest {
  id: string;
  customerId: string;
  customerName: string;
  shopkeeperId: string;
  status: string;
}

interface ShopkeeperNotification {
    id: string;
    message: string;
    type: 'success' | 'error';
    timestamp: Date;
}

interface CustomerForSelection extends UserProfile {
    balance: number;
}

type CreditRequestStatus = 'pending' | 'approved' | 'rejected';

interface ActiveCreditRequest extends DocumentData {
    id: string;
    status: CreditRequestStatus;
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
  const [activeRequest, setActiveRequest] = useState<ActiveCreditRequest | null>(null);
  const [error, setError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const qrSvgRef = useRef<HTMLDivElement>(null);

  // Effect for profile, customers, and connection requests
  useEffect(() => {
    if (!auth.currentUser || !firestore) {
        setLoadingProfile(false);
        return;
    };

    const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profile = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        setShopkeeperProfile(profile);

        if (!qrCodeDataUrl) {
          const savedQr = localStorage.getItem('shopkeeperQrCodePng');
          if (savedQr) setQrCodeDataUrl(savedQr);
        }

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

    const connectionsRef = collection(firestore, 'connectionRequests');
    const qConnections = query(connectionsRef, where('shopkeeperId', '==', auth.currentUser.uid), where('status', '==', 'pending'));
    
    const unsubscribeConnections = onSnapshot(qConnections, (querySnapshot) => {
      const newRequests: ConnectionRequest[] = [];
      querySnapshot.forEach(docSnap => {
          const req = { id: docSnap.id, ...docSnap.data() } as ConnectionRequest;
          newRequests.push(req);
      });
      setConnectionRequests(newRequests);

       // Auto-remove notifications from UI after 1 minute
      newRequests.forEach(req => {
        setTimeout(() => {
            setConnectionRequests(prevReqs => prevReqs.filter(r => r.id !== req.id));
        }, 60000); // 60 seconds
      });

    }, (error) => {
      console.error("Error fetching connection requests:", error);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeConnections();
    };
  }, [auth.currentUser, firestore, qrCodeDataUrl]);

  // Separate effect for tracking the active credit request's status
  useEffect(() => {
    if (!activeRequest || !firestore) return;

    const requestRef = doc(firestore, 'creditRequests', activeRequest.id);
    const unsubscribe = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [activeRequest, firestore]);

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
  
  const generateAndSaveQrCode = () => {
      setTimeout(() => {
        if (qrSvgRef.current) {
            const svgElement = qrSvgRef.current.querySelector('svg');
            if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx!.drawImage(img, 0, 0);
                    const pngUrl = canvas.toDataURL('image/png');
                    setQrCodeDataUrl(pngUrl);
                    localStorage.setItem('shopkeeperQrCodePng', pngUrl);
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
        }
    }, 100);
  }

  const handleOpenQrModal = () => {
      setShowQrModal(true);
      if (!qrCodeDataUrl) {
          generateAndSaveQrCode();
      }
  }

  const handleRegenerateQr = () => {
      localStorage.removeItem('shopkeeperQrCodePng');
      setQrCodeDataUrl(null);
      generateAndSaveQrCode();
  }

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
    if (!qrCodeDataUrl || !shopkeeperProfile?.shopkeeperCode) return;

    try {
        const response = await fetch(qrCodeDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                title: 'My Shopkeeper Code',
                text: `Connect with me on Udhar Pay! My code is: ${shopkeeperProfile.shopkeeperCode}`,
                files: [file],
            });
        } else {
            throw new Error("Sharing not supported or file type not allowed.");
        }
    } catch (error) {
        console.log('Fallback: Could not share image, copying code to clipboard.', error);
        navigator.clipboard.writeText(shopkeeperProfile.shopkeeperCode || '');
        alert('Shopkeeper code copied to clipboard! (Image sharing not supported on this browser)');
    }
  };

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
      setSelectedCustomer(customer);
      const amount = parseFloat(creditAmount);
      if (isNaN(amount) || amount <= 0 || !shopkeeperProfile || !firestore) {
          setError("An unexpected error occurred. Please start over.");
          return;
      }
      
      setIsRequestingCredit(true);
      setError('');

      try {
          const creditRequestsRef = collection(firestore, 'creditRequests');
          const newRequestRef = await addDoc(creditRequestsRef, {
              amount: amount,
              customerId: customer.uid,
              customerName: customer.displayName,
              shopkeeperId: shopkeeperProfile.uid,
              shopkeeperName: shopkeeperProfile.displayName,
              status: 'pending',
              createdAt: serverTimestamp(),
          });
          
          setActiveRequest({ id: newRequestRef.id, status: 'pending' });
          setStep('success');

      } catch (error) {
          console.error("Error creating credit request:", error);
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
      setActiveRequest(null);
      setIsRequestingCredit(false);
  }

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
                <p style={{ color: '#6c7293', margin: 0, fontSize: '14px'}}>Amount to request:</p>
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
                <div className="input-icon"><UsersIcon /></div>
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
    if (!selectedCustomer || !activeRequest) return null;

    const getStatusColor = (status: CreditRequestStatus) => {
        if (status === 'approved') return '#00c896'; // green
        if (status === 'rejected') return '#ff3b5c'; // red
        return '#d1d9e6'; // grey for pending line
    }
    
    const status = activeRequest.status;
    const isPending = status === 'pending';
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';

    return (
        <div className="modal-overlay">
            <div className="login-card modal-content" style={{maxWidth: '480px'}} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center'}}>
                    <h2 style={{fontSize: '1.5rem', marginBottom: '15px'}}>Request Status</h2>
                    <div style={{width: '100%', textAlign: 'left', background: '#e0e5ec', padding: '15px 20px', borderRadius: '20px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff'}}>
                        <p style={{color: '#9499b7', fontSize: '13px', margin: 0}}>To: <strong style={{color: '#3d4468'}}>{selectedCustomer.displayName}</strong></p>
                        <p style={{color: '#9499b7', fontSize: '13px', margin: 0}}>Amount: <strong style={{color: '#3d4468'}}>₹{parseFloat(creditAmount)}</strong></p>
                    </div>
                </div>

                <div style={{ padding: '30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{textAlign: 'center'}}>
                         <div className="neu-icon" style={{width: '40px', height: '40px', margin: '0 auto 5px', background: '#00c896', color: 'white'}}><Check size={20}/></div>
                         <p style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>Sent</p>
                    </div>
                    <div style={{flex: 1, height: '3px', background: getStatusColor(status), margin: '0 10px -15px 10px', transition: 'background 0.3s ease'}}></div>
                    <div style={{textAlign: 'center'}}>
                         <div className="neu-icon" style={{width: '40px', height: '40px', margin: '0 auto 5px', background: isPending ? '#e0e5ec' : getStatusColor(status), color: isPending ? '#6c7293' : 'white', transition: 'background 0.3s ease'}}>
                           {isPending ? <div className="neu-spinner" style={{width: '16px', height: '16px'}}></div> : isApproved ? <Check size={20}/> : <X size={20}/>}
                         </div>
                         <p style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>Responded</p>
                    </div>
                </div>

                <div style={{textAlign: 'center', minHeight: '40px'}}>
                    {isPending && <p style={{color: '#6c7293'}}>Waiting for customer to respond...</p>}
                    {isApproved && <p style={{color: '#00c896', fontWeight: 600}}>Customer has approved the request.</p>}
                    {isRejected && <p style={{color: '#ff3b5c', fontWeight: 600}}>Customer has rejected the request.</p>}
                </div>

                <button className="neu-button" onClick={resetCreditFlow} style={{marginTop: '20px', width: '100%', margin: 0}}>
                    Close
                </button>
            </div>
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
                    <UsersIcon size={24} />
                )}
                </div>
            </Link>
        </div>
        <div 
            className="token-balance" 
            style={{padding: '10px 15px', height: 'auto', flexDirection: 'row', gap: '10px', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexGrow: 1, margin: '0 10px'}}
            onClick={handleOpenQrModal}
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
              <h2>Notifications</h2>
              <button className="close-button" onClick={() => setIsMessageSidebarOpen(false)}>&times;</button>
          </div>
          <div className="sidebar-content" style={{overflowY: 'auto', padding: '10px'}}>
            {connectionRequests.length === 0 ? (
                <p style={{color: '#6c7293', textAlign: 'center'}}>
                    You have no new notifications.
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

              <div style={{background: 'white', padding: '20px', borderRadius: '20px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', marginBottom: '25px', position: 'relative'}}>
                {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Shopkeeper QR Code" style={{ width: '100%', height: 'auto', borderRadius: '10px' }} />
                ) : (
                    <div ref={qrSvgRef} style={{ opacity: 0, position: 'absolute', top: '-9999px', left: '-9999px' }}>
                        {shopkeeperProfile.shopkeeperCode && <QRCode value={shopkeeperProfile.shopkeeperCode} />}
                    </div>
                )}
                {!qrCodeDataUrl && <div className="neu-spinner" style={{margin: '40px auto'}}></div>}
              </div>
              
              <p style={{color: '#3d4468', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '2px'}}>{shopkeeperProfile.shopkeeperCode}</p>

              <div style={{display: 'flex', gap: '15px', marginTop: '25px'}}>
                 <button className="neu-button" onClick={handleShareCode} style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                      <Share2 size={20}/> Share
                  </button>
                   <button className="neu-button" onClick={handleRegenerateQr} style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                      <RefreshCw size={20}/> Regenerate
                  </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
