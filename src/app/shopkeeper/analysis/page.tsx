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
  
  const creditCustomerPercentage = analytics.totalCustomers > 0 ? (analytics.customersOnCredit / analytics.totalCustomers) * 100 : 0;
  const zeroBalanceCustomerPercentage = analytics.totalCustomers > 0 ? (analytics.customersWithZeroBalance / analytics.totalCustomers) * 100 : 0;


  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600', textAlign: 'center', marginBottom: '40px' }}>
                Udhaar Analysis
            </h1>
        
            {loadingAnalytics ? (
                <div className="loading-container" style={{minHeight: '250px'}}>
                    <div className="neu-spinner"></div>
                    <p style={{marginTop: '20px', color: '#6c7293'}}>Analyzing data...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                    {/* Main Outstanding Credit Card */}
                    <div style={{ 
                        background: 'linear-gradient(145deg, #4a5175, #34395a)', 
                        borderRadius: '25px', 
                        padding: '30px', 
                        textAlign: 'center', 
                        color: 'white',
                        boxShadow: '15px 15px 30px #b8bdc5, -15px -15px 30px #ffffff'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', opacity: 0.8, marginBottom: '10px'}}>
                            <Banknote size={20}/>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '500', margin: 0 }}>Total Outstanding Credit</h2>
                        </div>
                        <p style={{ margin: '0', fontSize: '3.5rem', fontWeight: 'bold' }}>
                            ₹{analytics.totalOutstanding.toLocaleString('en-IN')}
                        </p>
                    </div>

                    {/* Customer Stats Section */}
                    <div className="neu-input" style={{ padding: '25px', boxShadow: 'none' }}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '15px', color: '#3d4468', marginBottom: '20px'}}>
                            <Users size={24}/>
                            <h3 style={{fontSize: '1.2rem', fontWeight: 600, margin: 0}}>Customer Overview ({analytics.totalCustomers})</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Customers on Credit */}
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <BookUser size={16} className="text-red-500"/>
                                        <span style={{color: '#6c7293', fontSize: '14px'}}>Customers on Credit</span>
                                    </div>
                                    <span style={{color: '#3d4468', fontWeight: 600}}>{analytics.customersOnCredit} / {analytics.totalCustomers}</span>
                                </div>
                                <div style={{height: '10px', background: '#e0e5ec', borderRadius: '5px', boxShadow: 'inset 2px 2px 4px #bec3cf, inset -2px -2px 4px #ffffff', overflow: 'hidden'}}>
                                    <div style={{width: `${creditCustomerPercentage}%`, height: '100%', background: '#ff3b5c', borderRadius: '5px', transition: 'width 0.5s ease'}}></div>
                                </div>
                            </div>
                            
                            {/* Zero Balance Customers */}
                             <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <UserCheck size={16} className="text-green-500"/>
                                        <span style={{color: '#6c7293', fontSize: '14px'}}>Settled / Zero Balance</span>
                                    </div>
                                    <span style={{color: '#3d4468', fontWeight: 600}}>{analytics.customersWithZeroBalance} / {analytics.totalCustomers}</span>
                                </div>
                                <div style={{height: '10px', background: '#e0e5ec', borderRadius: '5px', boxShadow: 'inset 2px 2px 4px #bec3cf, inset -2px -2px 4px #ffffff', overflow: 'hidden'}}>
                                    <div style={{width: `${zeroBalanceCustomerPercentage}%`, height: '100%', background: '#00c896', borderRadius: '5px', transition: 'width 0.5s ease'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </main>
  );
}
