'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { Users, BookUser, UserCheck, IndianRupee, PieChart, ArrowDownCircle, Banknote } from 'lucide-react';

interface ShopkeeperProfile {
  uid: string;
  connections?: string[];
}

interface Transaction {
    id: string;
    amount: number;
    type: 'credit' | 'payment' | 'commission';
    customerId: string;
    shopkeeperId: string;
    timestamp: Timestamp;
    commissionRate?: number;
}

interface Analytics {
    totalCustomers: number;
    customersOnCredit: number;
    customersWithZeroBalance: number;
    totalOutstanding: number;
    totalPaymentReceivedLifetime: number; // Lifetime total received
}

export default function ShopkeeperAnalysisPage() {
  const { auth, firestore } = useFirebase();
  const [analytics, setAnalytics] = useState<Analytics>({ totalCustomers: 0, customersOnCredit: 0, customersWithZeroBalance: 0, totalOutstanding: 0, totalPaymentReceivedLifetime: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || !firestore) return;

    let unsubscribeTransactions: () => void = () => {};
    
    const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeShopkeeper = onSnapshot(shopkeeperRef, (shopkeeperSnap) => {
      unsubscribeTransactions(); 
      setLoadingAnalytics(true);

      if (!shopkeeperSnap.exists()) {
        setLoadingAnalytics(false);
        return;
      }
      
      const shopkeeperProfile = shopkeeperSnap.data() as ShopkeeperProfile;
      const customerIds = shopkeeperProfile.connections || [];
      
      if (customerIds.length === 0) {
        setAnalytics({ totalCustomers: 0, customersOnCredit: 0, customersWithZeroBalance: 0, totalOutstanding: 0, totalPaymentReceivedLifetime: 0 });
        setLoadingAnalytics(false);
        return;
      }

      const transactionsRef = collection(firestore, 'transactions');
      const q = query(transactionsRef, where('shopkeeperId', '==', auth.currentUser!.uid));

      unsubscribeTransactions = onSnapshot(q, (transactionsSnapshot) => {
        const customerBalances: { [key: string]: number } = {};
        customerIds.forEach(id => customerBalances[id] = 0);
        let totalPaymentReceivedLifetime = 0;

        const allTransactions = transactionsSnapshot.docs.map(doc => doc.data() as Transaction);

        allTransactions.forEach((transaction) => {
            if (customerBalances[transaction.customerId] !== undefined) {
                if (transaction.type === 'credit') {
                    customerBalances[transaction.customerId] += transaction.amount;
                } else if (transaction.type === 'payment') {
                    const commissionRate = transaction.commissionRate || 2.5; 
                    const principalAmount = transaction.amount / (1 + (commissionRate / 100));
                    customerBalances[transaction.customerId] -= principalAmount;
                    totalPaymentReceivedLifetime += principalAmount; // This will always accumulate
                }
            }
        });

        let totalOutstanding = 0;
        let customersOnCredit = 0;
        
        Object.values(customerBalances).forEach(balance => {
            if (balance > 0) {
                customersOnCredit++;
                totalOutstanding += balance;
            }
        });
        
        const totalCustomers = customerIds.length;

        setAnalytics({
            totalCustomers,
            customersOnCredit,
            customersWithZeroBalance: totalCustomers - customersOnCredit,
            totalOutstanding,
            totalPaymentReceivedLifetime
        });
        setLoadingAnalytics(false);

      }, (error) => {
        console.error("Error fetching transactions for analytics:", error);
        setLoadingAnalytics(false);
      });

    }, (error) => {
      console.error("Error fetching shopkeeper data for analytics:", error);
      setLoadingAnalytics(false);
    });

    return () => {
        unsubscribeShopkeeper();
        unsubscribeTransactions();
    }
  }, [auth.currentUser, firestore]);

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '40px'}}>
                 <div className="neu-icon"><div className="icon-inner"><PieChart size={40}/></div></div>
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Udhaar Analysis</h1>
                 <p style={{ color: '#9499b7' }}>Monitor your business performance.</p>
            </div>
        
            {loadingAnalytics ? (
                <div className="loading-container" style={{minHeight: '400px'}}>
                    <div className="neu-spinner"></div>
                    <p style={{marginTop: '20px', color: '#6c7293'}}>Analyzing your business data...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '25px' }}>
                        <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                            <Users size={32} className="mx-auto mb-4 text-primary"/>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Total Customers</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.totalCustomers}</p>
                        </div>
                         <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                            <BookUser size={32} className="mx-auto mb-4 text-blue-500"/>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Customers on Credit</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.customersOnCredit}</p>
                        </div>
                         <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                           <UserCheck size={32} className="mx-auto mb-4 text-green-500"/>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Settled Customers</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.customersWithZeroBalance}</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                        <div className="login-card" style={{ margin: 0, padding: '25px', textAlign: 'center', background: '#e8f5e9', border: '2px solid #c8e6c9' }}>
                            <Banknote size={36} className="mx-auto mb-4 text-green-600"/>
                            <p style={{color: '#1b5e20', fontSize: '1rem', fontWeight: 500, margin: 0}}>कुल भुगतान प्राप्त (लाइफटाइम)</p>
                            <p style={{color: '#2e7d32', fontSize: '2.5rem', fontWeight: 'bold', margin: '5px 0'}}>₹{analytics.totalPaymentReceivedLifetime.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                        <div className="login-card" style={{ margin: 0, padding: '25px', textAlign: 'center', background: '#ffebee', border: '2px solid #ffcdd2' }}>
                            <IndianRupee size={36} className="mx-auto mb-4 text-red-500"/>
                            <p style={{color: '#b71c1c', fontSize: '1rem', fontWeight: 500, margin: 0}}>Total Outstanding Udhaar</p>
                            <p style={{color: '#c62828', fontSize: '2.5rem', fontWeight: 'bold', margin: '5px 0'}}>₹{analytics.totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>

                </div>
            )}
        </div>
    </main>
  );
}
