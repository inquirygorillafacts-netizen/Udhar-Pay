'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { Users, BookUser, Banknote, UserCheck, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

const COLORS = ['#ff3b5c', '#00c896']; // Red for Credit, Green for Settled

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="login-card" style={{padding: '10px 15px', margin: 0, boxShadow: '10px 10px 20px #bec3cf, -10px -10px 20px #ffffff'}}>
        <p style={{color: '#3d4468', fontWeight: 600}}>{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

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
  
  const chartData = [
    { name: 'Customers on Credit', value: analytics.customersOnCredit },
    { name: 'Settled Customers', value: analytics.customersWithZeroBalance },
  ];

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', gridTemplateRows: 'auto auto' }}>

                    {/* Total Outstanding */}
                    <div className="login-card" style={{ gridColumn: '1 / -1', margin: 0, padding: '25px', textAlign: 'center', background: '#e0e5ec', boxShadow: '20px 20px 60px #bec3cf, -20px -20px 60px #ffffff' }}>
                        <p style={{color: '#6c7293', fontSize: '1rem', fontWeight: 500, margin: 0}}>Total Outstanding Credit</p>
                        <p style={{color: '#3d4468', fontSize: '3rem', fontWeight: 700, margin: '5px 0'}}>₹{analytics.totalOutstanding.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Chart */}
                    <div className="login-card" style={{ gridRow: '2 / 4', margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                         <h3 style={{color: '#3d4468', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', textAlign: 'center'}}>Customer Distribution</h3>
                         <div style={{width: '100%', height: '200px'}}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{outline: 'none'}} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                         </div>
                    </div>
                    
                    {/* Other Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="neu-input" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                             <div className="neu-icon" style={{width: '45px', height: '45px', margin: 0}}><Users/></div>
                             <div>
                                <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Total Customers</p>
                                <p style={{color: '#3d4468', fontSize: '1.75rem', fontWeight: 700, margin: 0}}>{analytics.totalCustomers}</p>
                             </div>
                        </div>
                         <div className="neu-input" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                             <div className="neu-icon" style={{width: '45px', height: '45px', margin: 0}}><BookUser color='#ff3b5c' /></div>
                             <div>
                                <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Customers on Credit</p>
                                <p style={{color: '#ff3b5c', fontSize: '1.75rem', fontWeight: 700, margin: 0}}>{analytics.customersOnCredit}</p>
                             </div>
                        </div>
                         <div className="neu-input" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                             <div className="neu-icon" style={{width: '45px', height: '45px', margin: 0}}><UserCheck color='#00c896'/></div>
                             <div>
                                <p style={{color: '#6c7293', fontSize: '14px', fontWeight: 500, margin: 0}}>Settled Customers</p>
                                <p style={{color: '#00c896', fontSize: '1.75rem', fontWeight: 700, margin: 0}}>{analytics.customersWithZeroBalance}</p>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </main>
  );
}
