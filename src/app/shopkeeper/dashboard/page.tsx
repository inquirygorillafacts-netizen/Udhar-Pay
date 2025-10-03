'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, DocumentData, writeBatch, updateDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { MessageSquare, X, Check, ArrowLeft, ArrowRight, QrCode, Share2, RefreshCw, User as UsersIcon, CheckCircle, XCircle, AlertTriangle, IndianRupee } from 'lucide-react';
import { acceptConnectionRequest, rejectConnectionRequest } from '@/lib/connections';
import CustomerCard from '@/app/shopkeeper/components/CustomerCard';
import QrPoster from '@/components/shopkeeper/QrPoster';
import { toPng } from 'html-to-image';
import SetCreditLimitModal from '@/components/shopkeeper/SetCreditLimitModal';


interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  balances?: { [key: string]: number };
  connections?: string[];
  shopkeeperCode?: string;
  customerCode?: string;
  defaultCreditLimit?: number;
  customerLimits?: { [key: string]: number };
  creditSettings?: { [key: string]: { limitType: 'default' | 'manual', manualLimit: number, isCreditEnabled: boolean } };
}

interface ConnectionRequest {
  id: string;
  customerId: string;
  customerName: string;
  shopkeeperId: string;
  status: string;
}

interface CustomerCreditRequest {
    id: string;
    customerId: string;
    customerName: string;
    amount: number;
    notes?: string;
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
  const [customerCreditRequests, setCustomerCreditRequests] = useState<CustomerCreditRequest[]>([]);
  
  // --- Give Credit State ---
  const [step, setStep] = useState('enterAmount'); // enterAmount, selectCustomer, success
  const [customers, setCustomers] = useState<CustomerForSelection[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerForSelection[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerForSelection | null>(null);
  
  const [creditAmount, setCreditAmount] = useState('');
  const [expression, setExpression] = useState('');
  const [displayValue, setDisplayValue] = useState('₹ 0');

  const [isRequestingCredit, setIsRequestingCredit] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ActiveCreditRequest | null>(null);
  const [error, setError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPosterDataUrl, setQrPosterDataUrl] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // New state for handling the connection approval modal
  const [showSetLimitModal, setShowSetLimitModal] = useState(false);
  const [activeConnectionRequest, setActiveConnectionRequest] = useState<ConnectionRequest | null>(null);
  
  // State for limit modal when giving credit
  const [showCreditLimitExceededModal, setShowCreditLimitExceededModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState<{ customer: CustomerForSelection; currentLimit: number } | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitModalError, setLimitModalError] = useState('');


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

        if (!qrPosterDataUrl) {
          const savedQr = localStorage.getItem('shopkeeperQrPosterPng');
          if (savedQr) setQrPosterDataUrl(savedQr);
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

    }, (error) => {
      console.error("Error fetching connection requests:", error);
    });
    
    const creditRequestsRef = collection(firestore, 'creditRequests');
    const qCredit = query(creditRequestsRef, where('shopkeeperId', '==', auth.currentUser.uid), where('status', '==', 'pending'), where('requestedBy', '==', 'customer'));

    const unsubscribeCreditRequests = onSnapshot(qCredit, (snapshot) => {
        const requests: CustomerCreditRequest[] = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() } as CustomerCreditRequest);
        });
        setCustomerCreditRequests(requests);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeConnections();
      unsubscribeCreditRequests();
    };
  }, [auth.currentUser, firestore, qrPosterDataUrl]);

  // Separate effect for tracking the active credit request's status
  useEffect(() => {
    if (!activeRequest?.id || !firestore) return;

    const requestRef = doc(firestore, 'creditRequests', activeRequest.id);
    const unsubscribe = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        // The request document may have been deleted or is no longer relevant
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [activeRequest?.id, firestore]);

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
  
  const generateAndSaveQrPoster = () => {
    setTimeout(() => {
      if (posterRef.current) {
        toPng(posterRef.current, { cacheBust: true, quality: 0.95 })
          .then((dataUrl) => {
            setQrPosterDataUrl(dataUrl);
            localStorage.setItem('shopkeeperQrPosterPng', dataUrl);
          })
          .catch((err) => {
            console.error('oops, something went wrong!', err);
          });
      }
    }, 500); // Small delay to ensure the component is fully rendered
  };

  const handleOpenQrModal = () => {
      setShowQrModal(true);
      if (!qrPosterDataUrl) {
          generateAndSaveQrPoster();
      }
  }

  const handleRegenerateQr = () => {
      localStorage.removeItem('shopkeeperQrPosterPng');
      setQrPosterDataUrl(null);
      generateAndSaveQrPoster();
  }

 const handleAcceptClick = (request: ConnectionRequest) => {
    setActiveConnectionRequest(request);
    setShowSetLimitModal(true);
  };

  const handleConfirmAcceptConnection = async (limitType: 'default' | 'manual', manualLimit?: number) => {
    if (!firestore || !activeConnectionRequest) return;
    try {
      await acceptConnectionRequest(firestore, {
        requestId: activeConnectionRequest.id,
        customerId: activeConnectionRequest.customerId,
        shopkeeperId: activeConnectionRequest.shopkeeperId,
        limitType: limitType,
        manualLimit: manualLimit
      });
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request.");
    } finally {
      setShowSetLimitModal(false);
      setActiveConnectionRequest(null);
    }
  };


  const handleRejectConnection = async (requestId: string) => {
      if (!firestore) return;
      try {
          await rejectConnectionRequest(firestore, requestId);
      } catch (error) {
          console.error("Error rejecting request:", error);
          alert("Failed to reject request.");
      }
  };
  
    const handleCreditRequestResponse = async (request: CustomerCreditRequest, response: 'approved' | 'rejected') => {
        if (!auth.currentUser || !firestore || !shopkeeperProfile) return;
        
        try {
            const requestRef = doc(firestore, 'creditRequests', request.id);

            if (response === 'approved') {
                const batch = writeBatch(firestore);
                batch.update(requestRef, { status: 'approved' });

                const balanceChange = request.amount;
                const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
                const customerRef = doc(firestore, 'customers', request.customerId);

                const shopkeeperBalances = shopkeeperProfile.balances || {};
                const newShopkeeperBalance = (shopkeeperBalances[request.customerId] || 0) + balanceChange;

                const customerDoc = await getDoc(customerRef);
                const customerBalances = customerDoc.data()?.balances || {};
                const newCustomerBalance = (customerBalances[auth.currentUser.uid] || 0) + balanceChange;

                batch.set(shopkeeperRef, { balances: { [request.customerId]: newCustomerBalance } }, { merge: true });
                batch.set(customerRef, { balances: { [auth.currentUser.uid]: newCustomerBalance } }, { merge: true });

                const transactionRef = doc(collection(firestore, 'transactions'));
                batch.set(transactionRef, {
                    amount: request.amount,
                    type: 'credit',
                    notes: request.notes || `Credit approved by shopkeeper`,
                    shopkeeperId: auth.currentUser.uid,
                    customerId: request.customerId,
                    timestamp: serverTimestamp(),
                });

                await batch.commit();
            } else {
                await updateDoc(requestRef, { status: 'rejected' });
            }
        } catch (error) {
            console.error("Error responding to credit request:", error);
            alert("An error occurred. Please try again.");
        }
    };


  const handleShareCode = async () => {
    if (!qrPosterDataUrl || !shopkeeperProfile?.shopkeeperCode) return;

    try {
        const response = await fetch(qrPosterDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'udhar-pay-qr.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                title: 'My Udhar Pay QR Code',
                text: `Connect with me on Udhar Pay! My shop code is: ${shopkeeperProfile.shopkeeperCode}`,
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

  const evaluateExpression = (expr: string): string => {
    // Basic sanitization and evaluation
    const sanitizedExpr = expr.replace(/[^0-9+\-*/.]/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    
    // Avoid evaluation of unsafe or incomplete expressions
    if (!sanitizedExpr || /[+\-*/.]$/.test(sanitizedExpr)) {
      return '';
    }

    try {
      // Using Function constructor for safer evaluation than eval()
      const result = new Function(`return ${sanitizedExpr}`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return String(Math.round(result * 100) / 100);
      }
      return '';
    } catch (error) {
      return '';
    }
  };

  const updateDisplay = (currentExpr: string) => {
    const result = evaluateExpression(currentExpr);
    const operators = ['+', '-', '*', '/', '×', '÷'];
    const hasOperator = operators.some(op => currentExpr.includes(op));

    if (result && hasOperator && !/[+\-*/.]$/.test(currentExpr)) {
        // If calculation is possible and valid, show the full story
        setDisplayValue(`${currentExpr.replace(/\*/g, '×').replace(/\//g, '÷')} = ${result}`);
        setCreditAmount(result);
    } else {
        // Otherwise, just show the current expression or 0
        setDisplayValue(`₹ ${currentExpr || '0'}`);
        setCreditAmount(currentExpr); // Keep amount in sync for the 'Next' button
    }
  };
  
  useEffect(() => {
    updateDisplay(expression);
  }, [expression]);

  const handleKeyPress = (key: string) => {
    if (expression.length >= 20) return;
    
    const operators = ['+', '-', '*', '/'];
    const lastChar = expression.slice(-1);

    if (operators.includes(lastChar) && operators.includes(key)) {
      setExpression(prev => prev.slice(0, -1) + key);
    } else if (key === '.' && (expression.split(/[+\-*/]/).pop()?.includes('.') || !expression || operators.includes(lastChar))) {
      return; 
    } else {
      setExpression(prev => prev + key);
    }
    setError('');
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };
  
  const proceedToCustomerSelection = () => {
    const finalAmount = parseFloat(creditAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
        setError("Please enter a valid amount to give credit.");
        return;
    }
    setStep('selectCustomer');
    setError('');
  }

  const handleSendRequest = async (customer: CustomerForSelection) => {
      setSelectedCustomer(customer);
      const amount = parseFloat(creditAmount);

      if (isNaN(amount) || amount <= 0 || !auth.currentUser || !firestore) {
          setError("An unexpected error occurred. Please start over.");
          return;
      }
      
      setIsRequestingCredit(true);
      setError('');
      
      try {
        // Fetch latest data for shopkeeper and customer right before transaction
        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        const customerRef = doc(firestore, 'customers', customer.uid);

        const [shopkeeperSnap, customerSnap] = await Promise.all([
          getDoc(shopkeeperRef),
          getDoc(customerRef)
        ]);

        if (!shopkeeperSnap.exists() || !customerSnap.exists()) {
          throw new Error("Could not verify profiles. Please try again.");
        }

        const latestShopkeeper = {uid: shopkeeperSnap.id, ...shopkeeperSnap.data()} as UserProfile;
        const latestCustomer = {uid: customerSnap.id, ...customerSnap.data()} as UserProfile;

        const customerSettings = latestShopkeeper.creditSettings?.[customer.uid];
        const isCreditEnabled = customerSettings?.isCreditEnabled ?? true;

        if (!isCreditEnabled) {
            alert("Credit is disabled for this customer. Please enable it in the Control Room to give credit.");
            setIsRequestingCredit(false);
            return;
        }

        const creditLimit = customerSettings?.limitType === 'manual'
            ? customerSettings.manualLimit
            : latestShopkeeper.defaultCreditLimit ?? 1000;
        
        const currentBalance = latestShopkeeper.balances?.[customer.uid] || 0;
        
        if (currentBalance + amount > creditLimit) {
            setLimitModalData({ customer, currentLimit: creditLimit });
            setShowCreditLimitExceededModal(true);
            setIsRequestingCredit(false);
            return;
        }

        const creditRequestsRef = collection(firestore, 'creditRequests');
        const newRequestRef = await addDoc(creditRequestsRef, {
            amount: amount,
            customerId: customer.uid,
            customerName: customer.displayName,
            shopkeeperId: latestShopkeeper.uid,
            shopkeeperName: latestShopkeeper.displayName,
            status: 'pending',
            createdAt: serverTimestamp(),
            requestedBy: 'shopkeeper'
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
      setExpression('');
      setError('');
      setActiveRequest(null);
      setIsRequestingCredit(false);
  }
  
  const getCreditLimitForCustomer = (customerId: string) => {
      if (!shopkeeperProfile) return 1000; // Fallback
      const settings = shopkeeperProfile.creditSettings?.[customerId];
      if (settings?.limitType === 'manual') {
          return settings.manualLimit;
      }
      return shopkeeperProfile.defaultCreditLimit ?? 1000;
  }
  
  const isCreditEnabledForCustomer = (customerId: string): boolean => {
      if (!shopkeeperProfile) return true; // Default to enabled
      const settings = shopkeeperProfile.creditSettings?.[customerId];
      // If settings is undefined, it means credit is enabled by default.
      return settings?.isCreditEnabled ?? true;
  }

  const handleSaveNewLimit = async () => {
      setLimitModalError('');
      const limitVal = parseFloat(newLimit);
      if (isNaN(limitVal) || limitVal <= 0) {
          setLimitModalError("Please enter a valid positive limit.");
          return;
      }
      if (!auth.currentUser || !limitModalData?.customer) return;

      setIsSavingLimit(true);
      try {
          const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
          const existingSettings = shopkeeperProfile?.creditSettings?.[limitModalData.customer.uid] || { isCreditEnabled: true, limitType: 'default', manualLimit: 0};
          
          await updateDoc(shopkeeperRef, {
              [`creditSettings.${limitModalData.customer.uid}`]: {
                  ...existingSettings,
                  limitType: 'manual',
                  manualLimit: limitVal,
              }
          });

          setShowCreditLimitExceededModal(false);
          setNewLimit('');
          alert(`Credit limit for ${limitModalData.customer.displayName} updated to ₹${limitVal}. You can now try the transaction again.`);
      } catch (err) {
          setLimitModalError("Failed to update limit. Please try again.");
      } finally {
          setIsSavingLimit(false);
      }
  };


  const renderEnterAmount = () => {
    return (
        <div className="login-card" style={{ maxWidth: '500px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '20px'}}>
                <h2>Give Credit (Udhaar)</h2>
            </div>
            
            <div className="neu-input" style={{ marginBottom: '20px', padding: '0 15px' }}>
                <input
                    type="text"
                    value={displayValue}
                    readOnly
                    placeholder="₹ 0"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        textAlign: 'center',
                        fontSize: displayValue.includes('=') ? '1.8rem' : '2.5rem',
                        fontWeight: '700',
                        color: '#3d4468',
                        width: '100%',
                        padding: '10px 0',
                        transition: 'font-size 0.2s ease-in-out'
                    }}
                />
            </div>

            {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px', animation: 'gentleShake 0.5s' }}>{error}</p>}
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                {['+', '-', '×', '÷'].map((op) => {
                    const operatorMap: { [key: string]: string } = { '×': '*', '÷': '/' };
                    const actualOperator = operatorMap[op] || op;
                    return (
                        <button key={op} className="neu-button" onClick={() => handleKeyPress(actualOperator)} style={{ margin: 0, padding: '10px', height: 'auto', flex: 1, fontSize: '18px', fontWeight: 'bold' }}>
                            {op}
                        </button>
                    );
                })}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(key => (
                <button key={key} className="neu-button" onClick={() => handleKeyPress(key)} style={{ margin: 0, height: '60px' }}>{key}</button>
                ))}
                <button className="neu-button" onClick={handleBackspace} style={{ margin: 0, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24}/></button>
            </div>
            
             <div style={{display: 'flex', gap: '15px'}}>
                <button 
                    className="neu-button"
                    onClick={proceedToCustomerSelection}
                    disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                    style={{ background: '#00c896', color: 'white', margin: 0, flex: 1, height: '60px' }}
                >
                    <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>Next <ArrowRight size={20}/></span>
                </button>
            </div>
        </div>
    );
  };

  const renderSelectCustomer = () => (
    <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
            <button className="neu-button" onClick={resetCreditFlow} style={{width: '50px', height: '50px', margin: 0, padding: 0}}>
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
                        <CustomerCard 
                          customer={customer} 
                          shopkeeperId={auth.currentUser!.uid} 
                          creditLimit={getCreditLimitForCustomer(customer.uid)}
                          isCreditEnabled={isCreditEnabledForCustomer(customer.uid)}
                        />
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
  
  const allNotificationsCount = connectionRequests.length + customerCreditRequests.length;

  if (loadingProfile) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }
  
  return (
    <>
    {showSetLimitModal && activeConnectionRequest && (
        <SetCreditLimitModal
            customerName={activeConnectionRequest.customerName}
            defaultLimit={shopkeeperProfile?.defaultCreditLimit ?? 1000}
            onClose={() => {
                setShowSetLimitModal(false);
                setActiveConnectionRequest(null);
            }}
            onConfirm={handleConfirmAcceptConnection}
        />
    )}
    
    {showCreditLimitExceededModal && limitModalData && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <div className="neu-icon" style={{background: '#ffc107', color: 'white', margin: '0 15px 0 0', width: '60px', height: '60px'}}><AlertTriangle size={30}/></div>
                  <h2 style={{fontSize: '1.5rem'}}>Credit Limit Reached</h2>
              </div>
              <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '25px', lineHeight: 1.7}}>
                  {limitModalData.customer.displayName} has reached their credit limit of <strong>₹{limitModalData.currentLimit}</strong>. To continue, you can increase their limit.
              </p>

              <div className="form-group">
                  <div className="neu-input">
                      <input type="number" id="new-limit" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} placeholder=" " required />
                      <label htmlFor="new-limit">New Credit Limit (₹)</label>
                      <div className="input-icon"><IndianRupee /></div>
                  </div>
              </div>
              {limitModalError && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{limitModalError}</p>}
              
              <div style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
                  <button className="neu-button" onClick={() => setShowCreditLimitExceededModal(false)} style={{margin:0, flex: 1}}>Cancel</button>
                  <button className={`neu-button ${isSavingLimit ? 'loading' : ''}`} onClick={handleSaveNewLimit} disabled={isSavingLimit} style={{margin:0, flex: 1, background: '#00c896', color: 'white'}}>
                      <span className="btn-text">Save New Limit</span>
                      <div className="btn-loader"><div className="neu-spinner"></div></div>
                  </button>
              </div>
          </div>
        </div>
      )}

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
            {allNotificationsCount > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff3b5c', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {allNotificationsCount}
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
            {allNotificationsCount === 0 ? (
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
                                <button className="neu-button" onClick={() => handleRejectConnection(req.id)} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#e0e5ec', color: '#ff3b5c' }}>
                                    Reject
                                </button>
                                <button className="neu-button" onClick={() => handleAcceptClick(req)} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#00c896', color: 'white' }}>
                                    Accept
                                </button>
                            </div>
                        </li>
                    ))}
                     {customerCreditRequests.map(req => (
                        <li key={req.id} style={{ background: '#e0e5ec', padding: '15px', borderRadius: '15px', boxShadow: '5px 5px 10px #bec3cf, -5px -5px 10px #ffffff' }}>
                            <p style={{ color: '#3d4468', fontWeight: '600', marginBottom: '5px' }}>
                                {req.customerName} is requesting a credit of <span style={{color: '#00c896'}}>₹{req.amount}</span>.
                            </p>
                            {req.notes && <p style={{color: '#9499b7', fontSize: '13px', fontStyle: 'italic', marginBottom: '10px'}}>" {req.notes} "</p>}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button className="neu-button" onClick={() => handleCreditRequestResponse(req, 'rejected')} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#e0e5ec', color: '#ff3b5c' }}>
                                    Reject
                                </button>
                                <button className="neu-button" onClick={() => handleCreditRequestResponse(req, 'approved')} style={{ margin: 0, width: 'auto', padding: '8px 16px', background: '#00c896', color: 'white' }}>
                                    Approve
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
        <div className="login-card modal-content" style={{maxWidth: '420px', textAlign: 'center', background: 'transparent', boxShadow: 'none', padding: 0}} onClick={(e) => e.stopPropagation()}>
          
          <div style={{position: 'relative'}}>
            {qrPosterDataUrl ? (
                <img src={qrPosterDataUrl} alt="Udhar Pay QR Code Poster" style={{ width: '100%', height: 'auto', borderRadius: '20px' }} />
            ) : (
              <div style={{ opacity: 0, position: 'absolute', top: '-9999px', left: '-9999px' }}>
                  <div ref={posterRef}>
                      <QrPoster 
                          shopkeeperName={shopkeeperProfile.displayName} 
                          shopkeeperCode={shopkeeperProfile.shopkeeperCode || ''}
                      />
                  </div>
              </div>
            )}
            {!qrPosterDataUrl && 
              <div style={{aspectRatio: '3/4', background: '#e0e5ec', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div className="neu-spinner"></div>
              </div>
            }
          </div>
          
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
