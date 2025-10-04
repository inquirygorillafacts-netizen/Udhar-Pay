'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Users, BookUser, UserCheck, IndianRupee, PieChart } from 'lucide-react';

interface ShopkeeperProfile {
  uid: string;
  connections?: string[];
}

interface CustomerProfile {
    uid: string;
    balances?: { [key: string]: number };
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

    // Listen to the shopkeeper's document primarily to get the list of connections.
    const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeShopkeeper = onSnapshot(shopkeeperRef, (shopkeeperSnap) => {
      if (!shopkeeperSnap.exists()) {
        setLoadingAnalytics(false);
        return;
      }
      
      setLoadingAnalytics(true);
      const shopkeeperProfile = shopkeeperSnap.data() as ShopkeeperProfile;
      const customerIds = shopkeeperProfile.connections || [];
      
      if (customerIds.length === 0) {
        setAnalytics({ totalCustomers: 0, customersOnCredit: 0, customersWithZeroBalance: 0, totalOutstanding: 0 });
        setLoadingAnalytics(false);
        return;
      }

      // Now, set up a listener for ALL connected customers.
      // This is the key change: we get real-time balance updates from each customer.
      const customersRef = collection(firestore, 'customers');
      const q = query(customersRef, where('__name__', 'in', customerIds));

      const unsubscribeCustomers = onSnapshot(q, (customersSnapshot) => {
        let totalOutstanding = 0;
        let customersOnCredit = 0;
        const shopkeeperId = auth.currentUser!.uid;

        customersSnapshot.forEach((customerDoc) => {
            const customerProfile = customerDoc.data() as CustomerProfile;
            const balance = customerProfile.balances?.[shopkeeperId] || 0;
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
        });
        setLoadingAnalytics(false);

      }, (error) => {
        console.error("Error fetching customer data for analytics:", error);
        setLoadingAnalytics(false);
      });

      // Return a cleanup function for the customers listener
      return () => unsubscribeCustomers();

    }, (error) => {
      console.error("Error fetching shopkeeper data for analytics:", error);
      setLoadingAnalytics(false);
    });

    // Return a cleanup function for the main shopkeeper listener
    return () => unsubscribeShopkeeper();
  }, [auth.currentUser, firestore]);

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '700px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '40px'}}>
                <div className="neu-icon"><div className="icon-inner"><PieChart /></div></div>
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Udhaar Analysis</h1>
                <p style={{color: '#9499b7'}}>Your business credit health at a glance.</p>
            </div>
        
            {loadingAnalytics ? (
                <div className="loading-container" style={{minHeight: '400px'}}>
                    <div className="neu-spinner"></div>
                    <p style={{marginTop: '20px', color: '#6c7293'}}>Analyzing data...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '25px' }}>
                        <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                            <div className="neu-icon" style={{width: '50px', height: '50px', margin: '0 auto 15px'}}><Users/></div>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Total Customers</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.totalCustomers}</p>
                        </div>
                         <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                            <div className="neu-icon" style={{width: '50px', height: '50px', margin: '0 auto 15px'}}><BookUser color='#3d4468'/></div>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Customers on Credit</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.customersOnCredit}</p>
                        </div>
                         <div className="neu-input" style={{ padding: '25px', textAlign: 'center' }}>
                           <div className="neu-icon" style={{width: '50px', height: '50px', margin: '0 auto 15px'}}><UserCheck color='#3d4468'/></div>
                            <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Settled Customers</p>
                            <p style={{color: '#3d4468', fontSize: '2rem', fontWeight: 700, margin: '5px 0'}}>{analytics.customersWithZeroBalance}</p>
                        </div>
                    </div>

                    <div className="login-card" style={{ margin: 0, padding: '25px', textAlign: 'center', background: 'linear-gradient(145deg, #d1d9e6, #f9f9f9)' }}>
                        <div className="neu-icon" style={{width: '60px', height: '60px', margin: '0 auto 15px'}}><IndianRupee/></div>
                        <p style={{color: '#6c7293', fontSize: '1rem', fontWeight: 500, margin: 0}}>Total Outstanding Credit</p>
                        <p style={{color: '#3d4468', fontSize: '2.5rem', fontWeight: 700, margin: '5px 0'}}>₹{analytics.totalOutstanding.toLocaleString('en-IN')}</p>
                    </div>

                </div>
            )}
        </div>
    </main>
  );
}
