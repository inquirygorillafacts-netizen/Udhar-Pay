
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Send, CheckCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Script from 'next/script';
import { useToast } from '@/hooks/use-toast';


declare const window: any;

const COMMISSION_RATE = 0.025;

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  pendingSettlement?: number;
}

interface Transaction {
  id: string;
  type: 'credit' | 'payment' | 'commission';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
}

interface PaymentNotification {
    type: 'success' | 'error';
    title: string;
    message: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const shopkeeperId = params.shopkeeperId as string;

  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotification | null>(null);

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
        router.push('/customer/dashboard');
      }
      setLoading(false);
    };
    
    fetchShopkeeperProfile();

    const transRef = collection(firestore, 'transactions');
    const q = query(
      transRef,
      where('customerId', '==', auth.currentUser.uid),
      where('shopkeeperId', '==', shopkeeperId)
    );

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const trans: Transaction[] = [];
      let balance = 0;
      snapshot.forEach(doc => {
        const tx = { id: doc.id, ...doc.data() } as Transaction;
        trans.push(tx);
        if (tx.type === 'credit' || tx.type === 'commission') {
            balance += tx.amount;
        } else if (tx.type === 'payment') {
            balance -= tx.amount;
        }
      });
      
      trans.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      setTransactions(trans);
      setCustomerBalance(balance);
    });

    return () => {
      unsubscribeTransactions();
    };

  }, [shopkeeperId, firestore, auth.currentUser, router]);

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount.' });
      return;
    }

    setIsProcessing(true);

    try {
        const res = await fetch('/api/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: paymentAmount }),
        });

        if (!res.ok) {
            throw new Error('Failed to create Razorpay order.');
        }

        const { id, amount: orderAmount, currency } = await res.json();
        
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderAmount.toString(),
            currency: currency,
            name: 'Udhar Pay',
            description: `Payment to ${shopkeeper?.displayName}`,
            order_id: id,
            handler: async function (response: any) {
                const verificationRes = await fetch('/api/payment/verify-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    }),
                });

                if (!verificationRes.ok) {
                    throw new Error('Payment verification failed.');
                }
                
                await recordPaymentTransaction(paymentAmount, response.razorpay_payment_id);
                setAmount('');
                setPaymentNotification({
                    type: 'success',
                    title: 'Payment Successful!',
                    message: `Your payment of ₹${paymentAmount} to ${shopkeeper?.displayName} was successful.`,
                });
            },
            prefill: {
                name: auth.currentUser?.displayName || '',
                email: auth.currentUser?.email || '',
            },
            theme: {
                color: '#00c896'
            }
        };
        
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any) {
             setPaymentNotification({
                type: 'error',
                title: 'Payment Failed',
                message: response.error.description || 'An unknown error occurred during payment.',
            });
        });
        rzp1.open();

    } catch (error) {
        console.error('Payment initiation error:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not initiate payment. Please try again.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const recordPaymentTransaction = async (paidAmount: number, paymentId: string) => {
      if (!auth.currentUser || !shopkeeper) return;
      const batch = writeBatch(firestore);
      
      const transactionRef = doc(collection(firestore, 'transactions'));
      
      // The amount recorded for the 'payment' transaction should be the full amount paid by the customer.
      batch.set(transactionRef, {
          amount: paidAmount,
          type: 'payment',
          notes: `Payment via Razorpay`,
          shopkeeperId: shopkeeperId,
          customerId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          paymentGatewayId: paymentId,
      });

      // The amount to be settled to the shopkeeper is the principal, which is the paid amount minus the commission.
      // We calculate it by dividing by (1 + COMMISSION_RATE) to reverse the commission addition.
      const principalAmount = paidAmount / (1 + COMMISSION_RATE);
      const settlementAmount = Math.round(principalAmount * 100) / 100;

      // Atomically update pending settlement for the shopkeeper with only the principal amount.
      const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
      const shopkeeperDoc = await getDoc(shopkeeperRef);
      const currentPending = shopkeeperDoc.data()?.pendingSettlement || 0;
      batch.update(shopkeeperRef, { pendingSettlement: currentPending + settlementAmount });
      
      await batch.commit();
  }

  
  const balanceColor = customerBalance > 0 ? '#ff3b5c' : '#00c896';
  const balanceText = customerBalance > 0 ? 'Udhaar' : (customerBalance < 0 ? 'Advance' : 'Settled');

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!shopkeeper) {
    return <div className="loading-container">Shopkeeper not found.</div>;
  }
  
  if (paymentNotification) {
      return (
          <div className="login-container">
              <div className="login-card" style={{maxWidth: '450px', textAlign: 'center'}}>
                <div className="neu-icon" style={{background: paymentNotification.type === 'success' ? '#00c896' : '#ff3b5c', color: 'white', width: '100px', height: '100px', marginBottom: '30px'}}>
                  {paymentNotification.type === 'success' ? <CheckCircle size={40}/> : <AlertTriangle size={40}/>}
                </div>
                <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '15px'}}>{paymentNotification.title}</h2>
                <p style={{color: '#6c7293', marginBottom: '30px', fontSize: '1rem'}}>
                    {paymentNotification.message}
                </p>
                <button className="neu-button" onClick={() => setPaymentNotification(null)}>
                    Back to Transactions
                </button>
              </div>
          </div>
      )
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div style={{ paddingBottom: '80px' }}>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
          <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
                  <p style={{fontSize: '3rem', fontWeight: 'bold', margin: '5px 0', color: balanceColor}}>₹{Math.abs(customerBalance).toLocaleString('en-IN')}</p>
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
                          disabled={isProcessing || !amount}
                          >
                          <span className="btn-text"><Send size={18}/> Pay Now</span>
                          <div className="btn-loader"><div className="neu-spinner"></div></div>
                      </button>
                  </div>
              </div>
          </div>

          <div style={{ maxWidth: '600px', margin: 'auto' }}>
              <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Transaction History</h2>
              {transactions.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      {transactions.map(tx => (
                        <div key={tx.id} className="neu-input" style={{display: 'flex', alignItems: 'center', padding: '15px 20px', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff' }}>
                           <div style={{ marginRight: '15px' }}>
                                {tx.type === 'credit' || tx.type === 'commission' ? (
                                    <div className="neu-icon" style={{ width: '45px', height: '45px', margin: 0, background: 'rgba(255, 59, 92, 0.1)', boxShadow: 'none' }}>
                                        <ArrowUpCircle size={24} color="#ff3b5c" />
                                    </div>
                                ) : (
                                    <div className="neu-icon" style={{ width: '45px', height: '45px', margin: 0, background: 'rgba(0, 200, 150, 0.1)', boxShadow: 'none' }}>
                                        <ArrowDownCircle size={24} color="#00c896" />
                                    </div>
                                )}
                            </div>
                            <div style={{flexGrow: 1}}>
                                <p style={{fontWeight: 600, color: '#3d4468', textTransform: 'capitalize', marginBottom: '2px'}}>
                                    {tx.type === 'credit' ? 'Udhaar Taken' : tx.type === 'commission' ? 'Platform Fee' : 'Payment Made'}
                                </p>
                                <p style={{fontSize: '12px', color: '#9499b7', margin: 0}}>
                                    {tx.timestamp ? tx.timestamp.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Processing...'}
                                </p>
                                {tx.notes && <p style={{fontSize: '13px', color: '#6c7293', marginTop: '5px', fontStyle: 'italic'}}>"{tx.notes}"</p>}
                            </div>
                            <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'payment' ? '#00c896' : '#ff3b5c'}}>
                                ₹{tx.amount}
                            </p>
                        </div>
                      ))}
                  </div>
              ) : (
                  <div className="login-card" style={{padding: '40px 20px'}}>
                    <p style={{textAlign: 'center', color: '#9499b7'}}>No transactions with this shopkeeper yet.</p>
                  </div>
              )}
          </div>
        </main>
      </div>
    </>
  );
}
