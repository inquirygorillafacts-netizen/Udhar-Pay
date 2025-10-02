'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

export default function RequestCreditPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const shopkeeperId = params.shopkeeperId as string;

  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
  const [customerProfile, setCustomerProfile] = useState<{displayName: string} | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!shopkeeperId || !auth.currentUser || !firestore) {
      router.push('/customer/dashboard');
      return;
    }

    const fetchProfiles = async () => {
      try {
        // Check if customer is connected to the shopkeeper
        const customerRef = doc(firestore, 'customers', auth.currentUser!.uid);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
            const customerData = customerSnap.data();
            setCustomerProfile(customerData as {displayName: string});
            const connections = customerData.connections || [];
            if (!connections.includes(shopkeeperId)) {
                toast({ variant: 'destructive', title: 'Not Connected', description: "You are not connected to this shopkeeper." });
                router.push('/customer/dashboard');
                return;
            }
        } else {
            throw new Error("Customer profile not found.");
        }

        const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
        const shopkeeperSnap = await getDoc(shopkeeperRef);

        if (shopkeeperSnap.exists()) {
          setShopkeeper({ uid: shopkeeperId, ...shopkeeperSnap.data() } as ShopkeeperProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Shopkeeper not found.' });
          router.push('/customer/dashboard');
          return;
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

  const handleRequestCredit = async () => {
    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!customerProfile) {
        setError("Could not find your profile. Please try again.");
        return;
    }

    setIsProcessing(true);
    setError('');

    try {
        const creditRequestsRef = collection(firestore, 'creditRequests');
        await addDoc(creditRequestsRef, {
            amount: creditAmount,
            notes: notes,
            customerId: auth.currentUser!.uid,
            customerName: customerProfile.displayName,
            shopkeeperId: shopkeeperId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        setSuccess(true);
    } catch (err) {
        console.error("Error creating credit request:", err);
        setError("Failed to send request. Please try again.");
        setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!shopkeeper) {
    return <div className="loading-container">Shopkeeper not found.</div>;
  }
  
  if (success) {
      return (
          <div className="login-container">
              <div className="login-card" style={{maxWidth: '450px', textAlign: 'center'}}>
                <div className="neu-icon" style={{background: '#00c896', color: 'white', width: '100px', height: '100px', marginBottom: '30px'}}>
                  <Send size={40}/>
                </div>
                <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '15px'}}>Request Sent!</h2>
                <p style={{color: '#6c7293', marginBottom: '30px', fontSize: '1rem'}}>
                    Your request for <strong>₹{amount}</strong> has been sent to <strong>{shopkeeper.displayName}</strong>. You will be notified upon approval.
                </p>
                <button className="neu-button" onClick={() => router.push('/customer/dashboard')}>
                    Back to Dashboard
                </button>
              </div>
          </div>
      )
  }

  return (
    <div>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
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
        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
            <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Enter Udhaar Details</h2>
            <div className="form-group">
                <div className="neu-input">
                    <div className="input-icon"><IndianRupee /></div>
                    <input
                        type="number"
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
                    <input
                        type="text"
                        placeholder=" "
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <label htmlFor="notes">Notes (e.g., 1kg Sugar, 2L Milk)</label>
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
