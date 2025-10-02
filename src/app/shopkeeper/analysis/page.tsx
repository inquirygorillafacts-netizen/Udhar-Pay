'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { Users, BookUser, Banknote, UserCheck } from 'lucide-react';

interface ShopkeeperProfile {
  uid: string;
  balances?: { [key: string]: number }; 
  connections?: string[];
}

interface Analytics {
    totalCustomers: number;
    customersOnCredit: number;
    customersWithZeroBalance: number;
    totalOutstanding: number;
}

export default function ShopkeeperAnalysisPage() {
  const { auth, firestore } = useFirebase();
  const [analytics, setAnalytics] = useState<Analytics>({ totalCustomers: 0, customersOnCredit: 0, customersWithZeroBalance: 0, totalOutstanding: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setLoadingAnalytics(true);
        const shopkeeperProfile = docSnap.data() as ShopkeeperProfile;
        
        const customerIds = shopkeeperProfile.connections || [];
        const balances = shopkeeperProfile.balances || {};
        
        let customersOnCredit = 0;
        let customersWithZeroBalance = 0;
        let totalOutstanding = 0;

        // Iterate over connected customer IDs to get the full picture
        customerIds.forEach(customerId => {
            const balance = balances[customerId];
            if (balance > 0) {
                customersOnCredit++;
                totalOutstanding += balance;
            } else if (balance === 0 || balance === undefined) {
                customersWithZeroBalance++;
            }
        });

        const totalCustomers = customerIds.length;

        setAnalytics({
            totalCustomers,
            customersOnCredit,
            customersWithZeroBalance,
            totalOutstanding
        });
        setLoadingAnalytics(false);
      } else {
        setLoadingAnalytics(false);
      }
    }, (error) => {
      console.error("Error fetching shopkeeper data for analytics:", error);
      setLoadingAnalytics(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, firestore]);

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
        <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600', textAlign: 'center', marginBottom: '40px' }}>
            Udhaar Analysis
        </h1>
        
        {loadingAnalytics ? (
            <div className="loading-container" style={{minHeight: '150px'}}>
                <div className="neu-spinner"></div>
                <p style={{marginTop: '20px', color: '#6c7293'}}>Analyzing data...</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', textAlign: 'center' }}>
                
                <div className="neu-input" style={{ padding: '25px 20px' }}>
                    <div className="neu-icon" style={{width: '60px', height: '60px', margin: '0 auto 15px'}}>
                        <div className="icon-inner" style={{width: '32px', height: '32px'}}><Users/></div>
                    </div>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Customers</p>
                    <p style={{ color: '#3d4468', margin: 0, fontSize: '2.5rem', fontWeight: '700' }}>{analytics.totalCustomers}</p>
                </div>

                <div className="neu-input" style={{ padding: '25px 20px' }}>
                    <div className="neu-icon" style={{width: '60px', height: '60px', margin: '0 auto 15px'}}>
                        <div className="icon-inner" style={{width: '32px', height: '32px'}}><BookUser/></div>
                    </div>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Customers on Credit</p>
                    <p style={{ color: '#ff3b5c', margin: 0, fontSize: '2.5rem', fontWeight: '700' }}>{analytics.customersOnCredit}</p>
                </div>

                <div className="neu-input" style={{ padding: '25px 20px' }}>
                    <div className="neu-icon" style={{width: '60px', height: '60px', margin: '0 auto 15px'}}>
                        <div className="icon-inner" style={{width: '32px', height: '32px', color: '#00c896'}}><UserCheck/></div>
                    </div>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Zero Balance</p>
                    <p style={{ color: '#3d4468', margin: 0, fontSize: '2.5rem', fontWeight: '700' }}>{analytics.customersWithZeroBalance}</p>
                </div>

                <div className="neu-input" style={{ padding: '25px 20px', gridColumn: '1 / -1' }}>
                    <div className="neu-icon" style={{width: '60px', height: '60px', margin: '0 auto 15px'}}>
                        <div className="icon-inner" style={{width: '32px', height: '32px'}}><Banknote/></div>
                    </div>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Outstanding Credit</p>
                    <p style={{ color: '#ff3b5c', margin: '0', fontSize: '2.5rem', fontWeight: '700' }}>₹{analytics.totalOutstanding.toLocaleString('en-IN')}</p>
                </div>
            </div>
        )}
        </div>
    </main>
  );
}
