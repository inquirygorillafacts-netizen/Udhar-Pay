'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Send } from 'lucide-react';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface Transaction {
  id: string;
  type: 'credit' | 'payment';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const shopkeeperId = params.shopkeeperId as string;

  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!shopkeeperId || !auth.currentUser) {
      router.push('/customer/dashboard');
      return;
    }

    const fetchShopkeeperProfile = async () => {
      const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
      const shopkeeperSnap = await getDoc(shopkeeperRef);
      if (shopkeeperSnap.exists()) {
        setShopkeeper({ uid: shopkeeperId, ...shopkeeperSnap.data() } as ShopkeeperProfile);
      } else {
        // Handle case where shopkeeper doesn't exist
        router.push('/customer/dashboard');
      }
    };
    
    fetchShopkeeperProfile();

    // Listener for customer's balance with this shopkeeper
    const customerRef = doc(firestore, 'customers', auth.currentUser.uid);
    const unsubscribeBalance = onSnapshot(customerRef, (docSnap) => {
      if (docSnap.exists()) {
        const balances = docSnap.data().balances || {};
        setCustomerBalance(balances[shopkeeperId] || 0);
      }
      setLoading(false);
    });

    // Listener for transactions
    const transRef = collection(firestore, 'transactions');
    const q = query(
      transRef,
      where('customerId', '==', auth.currentUser.uid),
      where('shopkeeperId', '==', shopkeeperId),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const trans: Transaction[] = [];
      snapshot.forEach(doc => {
        trans.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(trans);
    });

    return () => {
      unsubscribeBalance();
      unsubscribeTransactions();
    };

  }, [shopkeeperId, firestore, auth.currentUser, router]);

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsProcessing(true);
    //
    // --- PAYMENT LOGIC WILL GO HERE ---
    // We will implement the Firestore transaction logic in a future step.
    //
    alert(`Payment logic to be implemented for ₹${paymentAmount}`);
    // Simulate API call
    setTimeout(() => {
        setAmount('');
        setIsProcessing(false);
    }, 1500);
  };
  
  const balanceColor = customerBalance > 0 ? '#ff3b5c' : '#00c896';
  const balanceText = customerBalance > 0 ? 'Udhaar' : 'Advance';

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!shopkeeper) {
    // This can be a more elegant "not found" page
    return <div className="loading-container">Shopkeeper not found.</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
          <ArrowLeft size={20} />
        </button>
        <div style={{textAlign: 'center', flexGrow: 1}}>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>{shopkeeper.displayName}</h1>
          <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>{shopkeeper.email}</p>
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
        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '30px' }}>
            <div style={{textAlign: 'center'}}>
                <p style={{fontSize: '0.9rem', color: '#6c7293', margin: 0, fontWeight: 500}}>Your Current Balance</p>
                <p style={{fontSize: '3rem', fontWeight: 'bold', margin: '5px 0', color: balanceColor}}>₹{Math.abs(customerBalance)}</p>
                <p style={{fontSize: '0.9rem', fontWeight: 600, color: balanceColor}}>{balanceText}</p>
            </div>
        </div>

        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '40px' }}>
            <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Pay Amount</h2>
            <div className="form-group" style={{marginBottom: 0}}>
                <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                    <div className="input-icon"><IndianRupee /></div>
                    <input
                        type="number"
                        placeholder="Enter Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{paddingLeft: '55px', fontSize: '1.2rem'}}
                    />
                    <button 
                        className={`neu-button ${isProcessing ? 'loading' : ''}`} 
                        style={{width: 'auto', margin: '8px', padding: '10px 20px', flexShrink: 0, background: '#00c896', color: 'white'}}
                        onClick={handlePayment}
                        disabled={isProcessing}
                        >
                        <span className="btn-text"><Send size={18}/></span>
                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                    </button>
                </div>
            </div>
        </div>

        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
            <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Transaction History</h2>
            {transactions.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    {transactions.map(tx => (
                         <div key={tx.id} className="neu-input" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', boxShadow: 'none' }}>
                            <div>
                                <p style={{fontWeight: 600, color: tx.type === 'credit' ? '#ff3b5c' : '#00c896', textTransform: 'capitalize'}}>
                                    {tx.type === 'credit' ? 'Udhaar Added' : 'Payment Received'}
                                </p>
                                <p style={{fontSize: '12px', color: '#9499b7'}}>
                                    {tx.timestamp.toDate().toLocaleString()}
                                </p>
                            </div>
                             <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'credit' ? '#ff3b5c' : '#00c896'}}>
                                ₹{tx.amount}
                            </p>
                         </div>
                    ))}
                </div>
            ) : (
                <p style={{textAlign: 'center', color: '#9499b7'}}>No transactions with this shopkeeper yet.</p>
            )}
        </div>
      </main>
    </div>
  );
}
