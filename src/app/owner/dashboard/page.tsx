
'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp, getDocs, doc } from 'firebase/firestore';
import { Users, Store, IndianRupee, TrendingUp, ArrowLeftRight, Wallet } from 'lucide-react';

interface Transaction {
    amount: number;
    type: 'credit' | 'payment' | 'commission';
    timestamp: Timestamp;
    customerId: string;
    shopkeeperId: string;
    profit?: number;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    colorClass: string;
}

const StatCard = ({ title, value, icon, colorClass }: StatCardProps) => (
    <div className="login-card" style={{ padding: '20px', textAlign: 'center', flex: 1, minWidth: '140px' }}>
        <div className={`neu-icon`} style={{ width: '60px', height: '60px', margin: '0 auto 15px', color: 'white', background: colorClass, boxShadow: 'none' }}>
            {icon}
        </div>
        <h3 style={{ color: '#6c7293', fontSize: '14px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{title}</h3>
        <p style={{ color: '#3d4468', fontSize: '1.75rem', fontWeight: 700, margin: '5px 0 0 0' }}>{value}</p>
    </div>
);

const TransactionItem = ({ tx }: { tx: Transaction & { id: string, customerName?: string, shopkeeperName?: string } }) => {
    const isCredit = tx.type === 'credit';
    
    // We don't want to show commission transactions in the main feed
    if (tx.type === 'commission') return null;

    return (
        <div className="neu-input" style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff' }}>
            <div className="neu-icon" style={{ width: '45px', height: '45px', margin: 0, marginRight: '15px', background: isCredit ? 'rgba(255, 59, 92, 0.1)' : 'rgba(0, 200, 150, 0.1)', boxShadow: 'none' }}>
                <ArrowLeftRight size={20} color={isCredit ? '#ff3b5c' : '#00c896'} />
            </div>
            <div style={{ flexGrow: 1 }}>
                 <p style={{ fontWeight: 600, color: '#3d4468', marginBottom: '2px' }}>
                   {tx.customerName || 'Unknown Customer'} → {tx.shopkeeperName || 'Unknown Shop'}
                </p>
                 <p style={{ fontSize: '12px', color: '#6c7293' }}>
                    {tx.timestamp?.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) || 'now'}
                </p>
            </div>
            <div style={{textAlign: 'right'}}>
                <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isCredit ? '#ff3b5c' : '#00c896' }}>
                    ₹{tx.amount}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: isCredit ? '#ff3b5c' : '#00c896' }}>
                    {isCredit ? 'Udhaar' : 'Payment'}
                </p>
            </div>
        </div>
    );
};


export default function OwnerDashboardPage() {
    const { auth, firestore } = useFirebase();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalShopkeepers: 0,
        totalOutstanding: 0,
        newCustomers24h: 0,
        newShopkeepers24h: 0,
        totalTransactions24h: 0,
        profit24h: 0,
        profit30d: 0,
        totalProfit: 0,
    });

    const [recentTransactions, setRecentTransactions] = useState<(Transaction & { id: string, customerName?: string, shopkeeperName?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser || !firestore) {
            setLoading(false);
            return;
        }
        setUser(auth.currentUser);

        const transQuery = query(collection(firestore, 'transactions'));
        const unsubscribe = onSnapshot(transQuery, async (snapshot) => {
            setLoading(true);
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

            let totalOutstanding = 0;
            let profit24h = 0;
            let profit30d = 0;
            let totalProfit = 0;
            let transactionsToday = 0;

            const allTransactions: (Transaction & {id: string})[] = [];

            for (const txDoc of snapshot.docs) {
                const tx = txDoc.data() as Transaction;
                const txTimestamp = (tx.timestamp as Timestamp)?.toDate();
                
                // Correct calculation for total outstanding balance
                if (tx.type === 'credit' || tx.type === 'commission') {
                    totalOutstanding += tx.amount;
                } else if (tx.type === 'payment') {
                    totalOutstanding -= tx.amount;
                }
                
                if (tx.type === 'commission' && tx.profit && txTimestamp) {
                    totalProfit += tx.profit;
                    if (txTimestamp >= twentyFourHoursAgo) profit24h += tx.profit;
                    if (txTimestamp >= thirtyDaysAgo) profit30d += tx.profit;
                }
                
                if (txTimestamp && txTimestamp >= twentyFourHoursAgo) {
                    transactionsToday++;
                }

                allTransactions.push({id: txDoc.id, ...tx});
            }

            const customerCache: {[key: string]: string} = {};
            const shopkeeperCache: {[key: string]: string} = {};

            // Fetch all customers and shopkeepers at once to build a cache
            const customersSnap = await getDocs(collection(firestore, 'customers'));
            customersSnap.forEach(doc => customerCache[doc.id] = doc.data()?.displayName || 'Unknown');
            
            const shopkeepersSnap = await getDocs(collection(firestore, 'shopkeepers'));
            shopkeepersSnap.forEach(doc => shopkeeperCache[doc.id] = doc.data()?.displayName || 'Unknown');
            
            const transactionsWithNames = allTransactions.map(tx => ({
                ...tx,
                customerName: customerCache[tx.customerId],
                shopkeeperName: shopkeeperCache[tx.shopkeeperId],
            }));

            transactionsWithNames.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            
            const filteredRecentTransactions = transactionsWithNames.filter(tx => tx.type !== 'commission').slice(0, 5);
            setRecentTransactions(filteredRecentTransactions);
            
            const newCustomersQuery = query(collection(firestore, 'customers'), where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)));
            const newCustomersSnap = await getDocs(newCustomersQuery);

            const newShopkeepersQuery = query(collection(firestore, 'shopkeepers'), where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)));
            const newShopkeepersSnap = await getDocs(newShopkeepersQuery);

            setStats({
                totalCustomers: customersSnap.size,
                totalShopkeepers: shopkeepersSnap.size,
                newCustomers24h: newCustomersSnap.size,
                newShopkeepers24h: newShopkeepersSnap.size,
                totalTransactions24h: transactionsToday,
                totalOutstanding, // This is now correctly calculated and will be set
                profit24h: Math.round(profit24h * 100) / 100,
                profit30d: Math.round(profit30d * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
            });

            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth.currentUser, firestore]);
    
    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    return (
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div style={{ maxWidth: '800px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div className="login-card">
                    <div className="login-header" style={{ marginBottom: '30px' }}>
                        <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Owner Dashboard</h1>
                        <p style={{ color: '#9499b7' }}>Welcome, {user?.displayName || user?.email || 'Owner'}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                        <StatCard title="Total Customers" value={stats.totalCustomers.toString()} icon={<Users size={28} />} colorClass="#007BFF" />
                        <StatCard title="Total Shopkeepers" value={stats.totalShopkeepers.toString()} icon={<Store size={28} />} colorClass="#6f42c1" />
                        <StatCard title="Total Udhaar" value={`₹${stats.totalOutstanding.toLocaleString('en-IN')}`} icon={<IndianRupee size={28} />} colorClass="#ff3b5c" />
                    </div>
                </div>

                 <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Last 24 Hours</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard title="New Customers" value={`+${stats.newCustomers24h}`} icon={<TrendingUp size={28} />} colorClass="#00c896" />
                        <StatCard title="New Shops" value={`+${stats.newShopkeepers24h}`} icon={<TrendingUp size={28} />} colorClass="#00c896" />
                        <StatCard title="Transactions" value={`${stats.totalTransactions24h}`} icon={<ArrowLeftRight size={28} />} colorClass="#6c757d" />
                    </div>
                 </div>

                 <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Profit Analytics</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard title="24h Profit" value={`₹${stats.profit24h}`} icon={<IndianRupee size={28} />} colorClass="#28a745" />
                        <StatCard title="30d Profit" value={`₹${stats.profit30d}`} icon={<Wallet size={28} />} colorClass="#17a2b8" />
                        <StatCard title="Total Profit" value={`₹${stats.totalProfit}`} icon={<IndianRupee size={28} />} colorClass="#007bff" />
                    </div>
                 </div>

                <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Recent Platform Activity</h2>
                    {recentTransactions.length > 0 ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {recentTransactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#9499b7' }}>No transactions found yet.</p>
                    )}
                </div>
            </div>
        </main>
    );
}
