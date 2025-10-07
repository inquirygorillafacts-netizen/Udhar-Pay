'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { ArrowUpCircle, ArrowDownCircle, BookText } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'credit' | 'payment';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
  shopkeeperId: string;
}

interface ShopkeeperInfo {
    [id: string]: {
        displayName: string;
    }
}

export default function CustomerLedgerPage() {
  const { auth, firestore } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shopkeepers, setShopkeepers] = useState<ShopkeeperInfo>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const transRef = collection(firestore, 'transactions');
    // Remove orderBy from the query to avoid needing a composite index
    const q = query(
      transRef,
      where('customerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const trans: Transaction[] = [];
      const shopkeeperIds = new Set<string>();

      snapshot.forEach(doc => {
        const data = doc.data();
        trans.push({ id: doc.id, ...data } as Transaction);
        shopkeeperIds.add(data.shopkeeperId);
      });
      
      // Sort transactions on the client side after fetching
      trans.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toMillis() : Date.now();
        const timeB = b.timestamp ? b.timestamp.toMillis() : Date.now();
        return timeB - timeA;
      });
      setTransactions(trans);

      // Fetch shopkeeper details for any new IDs
      const newShopkeeperIds = Array.from(shopkeeperIds).filter(id => !shopkeepers[id]);
      if (newShopkeeperIds.length > 0) {
          const shopkeepersRef = collection(firestore, 'shopkeepers');
          const qShopkeepers = query(shopkeepersRef, where('__name__', 'in', newShopkeeperIds));
          const shopkeepersSnap = await getDocs(qShopkeepers);
          
          const newShopkeeperInfo: ShopkeeperInfo = {};
          shopkeepersSnap.forEach(doc => {
              newShopkeeperInfo[doc.id] = {
                  displayName: doc.data().displayName || 'A Shopkeeper'
              };
          });
          
          setShopkeepers(prev => ({...prev, ...newShopkeeperInfo}));
      }

      setLoading(false);
    }, (error) => {
        console.error("Error fetching ledger transactions:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, firestore, shopkeepers]);

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
      <div className="login-card" style={{width: '100%', margin: 'auto auto 30px auto', padding: '8px 30px'}}>
        <h1 style={{ color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center' }}>
            All Transactions
        </h1>
      </div>

        {loading ? (
             <div className="loading-container" style={{minHeight: '200px'}}>
                <div className="neu-spinner"></div>
                <p style={{marginTop: '20px', color: '#6c7293'}}>Loading your ledger...</p>
            </div>
        ) : transactions.length > 0 ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '700px', margin: 'auto'}}>
              {transactions.map(tx => (
                <Link key={tx.id} href={`/customer/payment/${tx.shopkeeperId}`} style={{ textDecoration: 'none' }}>
                  <div className="neu-input" style={{display: 'flex', alignItems: 'center', padding: '15px 20px', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff', cursor: 'pointer' }}>
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
                              {tx.type === 'credit' ? 'Udhaar Taken' : 'Payment Made'}
                          </p>
                          <p style={{fontSize: '14px', color: '#6c7293', fontWeight: 500, margin: '2px 0'}}>
                              To: {shopkeepers[tx.shopkeeperId]?.displayName || '...'}
                          </p>
                          <p style={{fontSize: '12px', color: '#9499b7', margin: 0}}>
                            {tx.timestamp ? tx.timestamp.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Processing...'}
                          </p>
                          {tx.notes && <p style={{fontSize: '13px', color: '#6c7293', marginTop: '5px', fontStyle: 'italic'}}>"{tx.notes}"</p>}
                      </div>
                      <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'credit' ? '#ff3b5c' : '#00c896'}}>
                          ₹{tx.amount}
                      </p>
                  </div>
                </Link>
              ))}
          </div>
        ) : (
            <div className="login-card" style={{maxWidth: '700px', margin: 'auto', padding: '40px 20px', textAlign: 'center'}}>
                <p style={{color: '#9499b7'}}>You have no transactions yet. Start by connecting with a shopkeeper!</p>
            </div>
        )}
    </main>
  );
}
