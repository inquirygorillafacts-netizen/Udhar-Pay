
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { ArrowLeft, User, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface Transaction {
  id: string;
  type: 'credit' | 'payment' | 'commission';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
  commissionRate?: number;
}

export default function CustomerTransactionHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Balances are now calculated directly from transactions
  const [netBalance, setNetBalance] = useState(0);
  const [totalPaymentReceived, setTotalPaymentReceived] = useState(0);

  useEffect(() => {
    if (!customerId || !auth.currentUser) {
      router.push('/shopkeeper/customers');
      return;
    }

    const fetchCustomerProfile = async () => {
      try {
        const customerRef = doc(firestore, 'customers', customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          setCustomer({ uid: customerId, ...customerSnap.data() } as CustomerProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Customer not found.' });
          router.push('/shopkeeper/customers');
          return;
        }
      } catch (e) {
         toast({ variant: 'destructive', title: 'Error', description: 'Could not load customer data.' });
         router.push('/shopkeeper/customers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerProfile();

    const transRef = collection(firestore, 'transactions');
    const q = query(
      transRef,
      where('shopkeeperId', '==', auth.currentUser.uid),
      where('customerId', '==', customerId)
    );

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      
      allTransactions.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });

      let totalCredit = 0;
      let totalPaymentPrincipal = 0;
      
      allTransactions.forEach(tx => {
          if (tx.type === 'credit') {
              totalCredit += tx.amount;
          } else if (tx.type === 'payment') {
              const commissionRate = tx.commissionRate || 2.5; // Fallback to default if not present
              const principalAmount = tx.amount / (1 + (commissionRate / 100));
              totalPaymentPrincipal += principalAmount;
          }
      });
      
      const adjustedTransactions = allTransactions
        .filter(tx => tx.type !== 'commission') // Filter out commission transactions from view
        .map(tx => {
          if (tx.type === 'payment') {
              const commissionRate = tx.commissionRate || 2.5;
              const principalAmount = tx.amount / (1 + (commissionRate / 100));
              return {...tx, amount: Math.round(principalAmount * 100) / 100};
          }
          return tx;
        });

      setTransactions(adjustedTransactions);
      setNetBalance(totalCredit - totalPaymentPrincipal);
      setTotalPaymentReceived(totalPaymentPrincipal);

    }, (error) => {
        console.error("Error fetching transactions: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load transactions.' });
    });

    return () => {
      unsubscribeTransactions();
    };
  }, [customerId, firestore, auth.currentUser, router, toast]);

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!customer) {
    // This case is handled in useEffect, but as a fallback
    return <div className="loading-container">Customer not found.</div>;
  }
  
  return (
    <div style={{ paddingBottom: '80px' }}>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
        
        <div style={{ maxWidth: '600px', margin: 'auto', marginBottom: '30px', display: 'flex', gap: '20px' }}>
            <div className="login-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
                <p style={{fontSize: '0.9rem', color: '#ff3b5c', margin: 0, fontWeight: 500}}>कुल उधार (बकाया)</p>
                <p style={{fontSize: '1.75rem', fontWeight: 'bold', margin: '5px 0', color: '#3d4468'}}>₹{netBalance > 0 ? netBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</p>
            </div>
            <div className="login-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
                 <p style={{fontSize: '0.9rem', color: '#00c896', margin: 0, fontWeight: 500}}>भुगतान मिला</p>
                <p style={{fontSize: '1.75rem', fontWeight: 'bold', margin: '5px 0', color: '#3d4468'}}>₹{totalPaymentReceived.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
        </div>

        <div style={{ maxWidth: '600px', margin: 'auto' }}>
            <h2 style={{color: '#3d4468', fontWeight: 600, fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>All Transactions</h2>
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
                                    {tx.timestamp?.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) || 'Processing...'}
                                </p>
                                {tx.notes && <p style={{fontSize: '13px', color: '#6c7293', marginTop: '5px', fontStyle: 'italic'}}>"{tx.notes}"</p>}
                            </div>
                            <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'payment' ? '#00c896' : '#ff3b5c'}}>
                                ₹{tx.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
