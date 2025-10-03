'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface CustomerProfile {
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

export default function CustomerTransactionHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [shopkeeperBalance, setShopkeeperBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId || !auth.currentUser) {
      router.push('/shopkeeper/customers');
      return;
    }

    const fetchCustomerProfile = async () => {
      const customerRef = doc(firestore, 'customers', customerId);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        setCustomer({ uid: customerId, ...customerSnap.data() } as CustomerProfile);
      } else {
        router.push('/shopkeeper/customers');
      }
    };
    
    fetchCustomerProfile();

    const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeBalance = onSnapshot(shopkeeperRef, (docSnap) => {
      if (docSnap.exists()) {
        const balances = (docSnap.data() as any).balances || {};
        setShopkeeperBalance(balances[customerId] || 0);
      }
      setLoading(false);
    });

    const transRef = collection(firestore, 'transactions');
    const q = query(
      transRef,
      where('shopkeeperId', '==', auth.currentUser.uid),
      where('customerId', '==', customerId),
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
  }, [customerId, firestore, auth.currentUser, router]);

  const balanceColor = shopkeeperBalance > 0 ? '#ff3b5c' : (shopkeeperBalance < 0 ? '#007bff' : '#00c896');
  const balanceText = shopkeeperBalance > 0 ? 'Udhaar' : (shopkeeperBalance < 0 ? 'Advance' : 'Settled');

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!customer) {
    return <div className="loading-container">Customer not found.</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
          <ArrowLeft size={20} />
        </button>
        <div style={{textAlign: 'center', flexGrow: 1}}>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>{customer.displayName}</h1>
          <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>Transaction History</p>
        </div>
        <div className="user-avatar neu-icon" style={{width: '45px', height: '45px', margin: 0, flexShrink: 0}}>
          {customer.photoURL ? (
              <img src={customer.photoURL} alt={customer.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
          ) : (
              <User size={24} />
          )}
        </div>
      </header>

      <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '30px' }}>
            <div style={{textAlign: 'center'}}>
                <p style={{fontSize: '0.9rem', color: '#6c7293', margin: 0, fontWeight: 500}}>Current Balance</p>
                <p style={{fontSize: '3rem', fontWeight: 'bold', margin: '5px 0', color: balanceColor}}>₹{Math.abs(shopkeeperBalance)}</p>
                <p style={{fontSize: '0.9rem', fontWeight: 600, color: balanceColor}}>{balanceText}</p>
            </div>
        </div>

        <div style={{ maxWidth: '600px', margin: 'auto' }}>
            <h2 style={{color: '#3d4468', fontWeight: 600, fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>Recent Transactions</h2>
            {transactions.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    {transactions.map(tx => (
                        <div key={tx.id} className="neu-input" style={{display: 'flex', alignItems: 'center', padding: '15px 20px', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff' }}>
                           <div style={{ marginRight: '15px' }}>
                                {tx.type === 'credit' ? (
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
                                    {tx.type === 'credit' ? 'Udhaar Given' : 'Payment Received'}
                                </p>
                                <p style={{fontSize: '12px', color: '#9499b7', margin: 0}}>
                                    {tx.timestamp.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                                {tx.notes && <p style={{fontSize: '13px', color: '#6c7293', marginTop: '5px', fontStyle: 'italic'}}>"{tx.notes}"</p>}
                            </div>
                            <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'credit' ? '#ff3b5c' : '#00c896'}}>
                                ₹{tx.amount}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="login-card" style={{padding: '40px 20px'}}>
                    <p style={{textAlign: 'center', color: '#9499b7', margin: 0}}>No transactions with this customer yet.</p>
                 </div>
            )}
        </div>
      </main>
    </div>
  );
}
