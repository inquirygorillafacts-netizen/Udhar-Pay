'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, DocumentData } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  defaultCreditLimit?: number;
  creditSettings?: { [key: string]: { limitType: 'default' | 'manual', manualLimit: number, isCreditEnabled: boolean } };
}

interface CustomerProfile {
    uid: string;
    displayName: string;
    connections?: string[];
}

type CreditRequestStatus = 'pending' | 'approved' | 'rejected';

interface ActiveCreditRequest extends DocumentData {
    id: string;
    status: CreditRequestStatus;
}

export default function RequestCreditPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const shopkeeperId = params.shopkeeperId as string;

  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [activeRequest, setActiveRequest] = useState<ActiveCreditRequest | null>(null);

  useEffect(() => {
    if (!shopkeeperId || !auth.currentUser || !firestore) {
      router.push('/customer/dashboard');
      return;
    }

    const fetchProfiles = async () => {
      try {
        const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
        const shopkeeperSnap = await getDoc(shopkeeperRef);
        if (shopkeeperSnap.exists()) {
            setShopkeeper({ uid: shopkeeperId, ...shopkeeperSnap.data() } as ShopkeeperProfile);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Shopkeeper not found.' });
            router.push('/customer/dashboard');
            return;
        }

        const customerRef = doc(firestore, 'customers', auth.currentUser!.uid);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
            const customerData = { uid: customerSnap.id, ...customerSnap.data() } as CustomerProfile;
            setCustomerProfile(customerData);
            const connections = customerData.connections || [];
            if (!connections.includes(shopkeeperId)) {
                toast({ variant: 'destructive', title: 'Not Connected', description: "You are not connected to this shopkeeper." });
                router.push('/customer/dashboard');
                return;
            }
        } else {
            throw new Error("Customer profile not found.");
        }

      } catch (err) {
        console.error("Error fetching profiles:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load data. Please try again.' });
        router.push('/customer/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfiles();

  }, [shopkeeperId, firestore, auth.currentUser, router, toast]);
  
  // Effect for tracking the active credit request's status
  useEffect(() => {
    if (!activeRequest?.id || !firestore) return;

    const requestRef = doc(firestore, 'creditRequests', activeRequest.id);
    const unsubscribe = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        // The request document may have been deleted
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [activeRequest?.id, firestore]);

  const handleRequestCredit = async () => {
    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    
    if (!auth.currentUser || !firestore || !shopkeeper || !customerProfile) {
        setError("Authentication error. Please refresh and try again.");
        return;
    }
    setIsProcessing(true);
    setError('');

    try {
        const customerSettings = shopkeeper.creditSettings?.[auth.currentUser.uid];
        const isCreditEnabled = customerSettings?.isCreditEnabled ?? true;

        if (!isCreditEnabled) {
            setError("उधार सुविधा इस दुकानदार द्वारा आपके लिए बंद कर दी गई है।");
            setIsProcessing(false);
            return;
        }

        const creditLimit = customerSettings?.limitType === 'manual'
            ? customerSettings.manualLimit
            : shopkeeper.defaultCreditLimit ?? 1000;

        const transQuery = query(
            collection(firestore, 'transactions'), 
            where('customerId', '==', auth.currentUser.uid), 
            where('shopkeeperId', '==', shopkeeperId)
        );
        const transSnap = await getDocs(transQuery);
        let currentBalance = 0;
        transSnap.forEach(doc => {
            const tx = doc.data();
            if (tx.type === 'credit' || tx.type === 'commission') currentBalance += tx.amount;
            else if (tx.type === 'payment') currentBalance -= tx.amount;
        });
        
        if (currentBalance + creditAmount > creditLimit) {
            const remainingLimit = creditLimit - currentBalance;
            setError(`यह अनुरोध आपकी उधार सीमा (₹${creditLimit}) से अधिक हो जाएगा। आप केवल ₹${remainingLimit > 0 ? remainingLimit.toFixed(2) : 0} तक का अनुरोध कर सकते हैं।`);
            setIsProcessing(false);
            return;
        }

        const creditRequestsRef = collection(firestore, 'creditRequests');
        const newRequestRef = await addDoc(creditRequestsRef, {
            amount: creditAmount,
            notes: notes,
            customerId: auth.currentUser.uid,
            customerName: customerProfile.displayName,
            shopkeeperId: shopkeeperId,
            shopkeeperName: shopkeeper.displayName,
            status: 'pending',
            createdAt: serverTimestamp(),
            requestedBy: 'customer'
        });
        setActiveRequest({ id: newRequestRef.id, status: 'pending' });

    } catch (err) {
        console.error("Error creating credit request:", err);
        setError("Failed to send request. Please try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!shopkeeper) {
    return <div className="loading-container">Shopkeeper not found.</div>;
  }
  
  const resetFlow = () => {
    setActiveRequest(null);
    setAmount('');
    setNotes('');
    setError('');
  };
  
  if (activeRequest) {
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
                        <p style={{color: '#9499b7', fontSize: '13px', margin: 0}}>To: <strong style={{color: '#3d4468'}}>{shopkeeper.displayName}</strong></p>
                        <p style={{color: '#9499b7', fontSize: '13px', margin: 0}}>Amount: <strong style={{color: '#3d4468'}}>₹{amount}</strong></p>
                        {notes && <p style={{color: '#9499b7', fontSize: '13px', fontStyle: 'italic', margin: '2px 0 0 0'}}>Note: "{notes}"</p>}
                    </div>
                </div>

                 <div style={{ padding: '30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{textAlign: 'center'}}>
                         <div className="neu-icon" style={{width: '40px', height: '40px', margin: '0 auto 5px', background: '#00c896', color: 'white'}}><CheckCircle size={20}/></div>
                         <p style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>Sent</p>
                    </div>
                    <div style={{flex: 1, height: '3px', background: isApproved ? '#00c896' : isRejected ? '#ff3b5c' : '#d1d9e6', margin: '0 10px -15px 10px', transition: 'background 0.3s ease'}}></div>
                    <div style={{textAlign: 'center'}}>
                         <div className="neu-icon" style={{width: '40px', height: '40px', margin: '0 auto 5px', background: isPending ? '#e0e5ec' : (isApproved ? '#00c896' : '#ff3b5c'), color: isPending ? '#6c7293' : 'white', transition: 'background 0.3s ease'}}>
                           {isPending ? <div className="neu-spinner" style={{width: '16px', height: '16px'}}></div> : isApproved ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                         </div>
                         <p style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>Responded</p>
                    </div>
                </div>

                <div style={{textAlign: 'center', minHeight: '40px'}}>
                    {isPending && <p style={{color: '#6c7293'}}>Waiting for shopkeeper to respond...</p>}
                    {isApproved && <p style={{color: '#00c896', fontWeight: 600}}>Shopkeeper has approved your request.</p>}
                    {isRejected && <p style={{color: '#ff3b5c', fontWeight: 600}}>Shopkeeper has rejected your request.</p>}
                </div>

                <button className="neu-button" onClick={() => router.push('/customer/dashboard')} style={{marginTop: '20px', width: '100%', margin: 0}}>
                    Back to Dashboard
                </button>
            </div>
        </div>
      )
  }

  return (
    <div>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <ArrowLeft size={20} />
        </button>
        <div style={{textAlign: 'center', flexGrow: 1}}>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Request Credit</h1>
          <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>From: {shopkeeper.displayName}</p>
        </div>
         <div className="user-avatar neu-icon" style={{width: '45px', height: '45px', margin: 0, flexShrink: 0}}>
          {shopkeeper.photoURL ? (
              <img src={shopkeeper.photoURL} alt={shopkeeper.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
          ) : (
              <User size={24} />
          )}
        </div>
      </header>

      <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ margin: 'auto' }}>
            <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Enter Udhaar Details</h2>
            <div className="form-group">
                <div className="neu-input">
                    <div className="input-icon"><IndianRupee /></div>
                    <input
                        type="number"
                        id="amount"
                        placeholder=" "
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{paddingLeft: '55px', fontSize: '1.2rem'}}
                    />
                    <label htmlFor="amount">Enter Amount</label>
                </div>
            </div>
             <div className="form-group" style={{marginBottom: '30px'}}>
                <div className="neu-input">
                    <div className="input-icon"><Send /></div>
                    <input
                        type="text"
                        id="notes"
                        placeholder=" "
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{paddingLeft: '55px'}}
                    />
                    <label htmlFor="notes">Notes (Optional, e.g., "for groceries")</label>
                </div>
            </div>
            
            {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
            <button 
                className={`neu-button ${isProcessing ? 'loading' : ''}`} 
                style={{margin: 0, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}
                onClick={handleRequestCredit}
                disabled={isProcessing}
                >
                <span className="btn-text"><Send size={18}/> Send Request</span>
                <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
        </div>
      </main>
    </div>
  );
}
