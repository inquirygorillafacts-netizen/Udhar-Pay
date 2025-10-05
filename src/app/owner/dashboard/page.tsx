'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { Users, Store, IndianRupee, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';

interface Transaction {
    amount: number;
    type: 'credit' | 'payment';
    timestamp: Timestamp;
    customerId: string;
    shopkeeperId: string;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    colorClass: string;
}

const StatCard = ({ title, value, icon, colorClass }: StatCardProps) => (
    <div className="login-card" style={{ padding: '20px', textAlign: 'center', flex: 1, minWidth: '140px' }}>
        <div className={`neu-icon ${colorClass}`} style={{ width: '60px', height: '60px', margin: '0 auto 15px', color: 'white', background: colorClass, boxShadow: 'none' }}>
            {icon}
        </div>
        <h3 style={{ color: '#6c7293', fontSize: '14px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{title}</h3>
        <p style={{ color: '#3d4468', fontSize: '1.75rem', fontWeight: 700, margin: '5px 0 0 0' }}>{value}</p>
    </div>
);

const TransactionItem = ({ tx }: { tx: Transaction & { id: string, customerName?: string, shopkeeperName?: string } }) => {
    const isCredit = tx.type === 'credit';
    return (
        <div className="neu-input" style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff' }}>
            <div className="neu-icon" style={{ width: '45px', height: '45px', margin: 0, marginRight: '15px', background: isCredit ? 'rgba(255, 59, 92, 0.1)' : 'rgba(0, 200, 150, 0.1)', boxShadow: 'none' }}>
                <ArrowLeftRight size={20} color={isCredit ? '#ff3b5c' : '#00c896'} />
            </div>
            <div style={{ flexGrow: 1 }}>
                 <p style={{ fontWeight: 600, color: '#3d4468', marginBottom: '2px' }}>
                   {isCredit ? `From ${tx.shopkeeperName}` : `To ${tx.shopkeeperName}`}
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
        newCustomersToday: 0,
        newShopkeepersToday: 0,
        totalTransactionsToday: 0
    });

    const [recentTransactions, setRecentTransactions] = useState<(Transaction & { id: string, customerName?: string, shopkeeperName?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser || !firestore) {
            setLoading(false);
            return;
        }
        setUser(auth.currentUser);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const unsubCustomers = onSnapshot(query(collection(firestore, 'customers')), snapshot => {
            const newToday = snapshot.docs.filter(doc => doc.data().createdAt?.toDate() >= today).length;
            setStats(prev => ({...prev, totalCustomers: snapshot.size, newCustomersToday: newToday }));
        });

        const unsubShopkeepers = onSnapshot(query(collection(firestore, 'shopkeepers')), snapshot => {
             const newToday = snapshot.docs.filter(doc => doc.data().createdAt?.toDate() >= today).length;
            setStats(prev => ({...prev, totalShopkeepers: snapshot.size, newShopkeepersToday: newToday}));
        });
        
        const unsubTransactions = onSnapshot(query(collection(firestore, 'transactions')), async (snapshot) => {
            let totalOutstanding = 0;
            const transactionsToday = snapshot.docs.filter(doc => doc.data().timestamp?.toDate() >= today).length;

            const allTransactions: (Transaction & {id: string, customerName?: string, shopkeeperName?: string })[] = [];

            const customerPromises: Promise<any>[] = [];
            const shopkeeperPromises: Promise<any>[] = [];
            const customerCache: {[key: string]: string} = {};
            const shopkeeperCache: {[key: string]: string} = {};

            snapshot.forEach(txDoc => {
                const tx = { id: txDoc.id, ...txDoc.data() } as Transaction;
                
                 if (tx.type === 'credit') {
                    totalOutstanding += tx.amount;
                } else if (tx.type === 'payment') {
                    totalOutstanding -= tx.amount;
                }

                allTransactions.push(tx);

                if (!customerCache[tx.customerId]) {
                    customerPromises.push(getDoc(doc(firestore, 'customers', tx.customerId)));
                }
                 if (!shopkeeperCache[tx.shopkeeperId]) {
                    shopkeeperPromises.push(getDoc(doc(firestore, 'shopkeepers', tx.shopkeeperId)));
                }
            });

            const customerDocs = await Promise.all(customerPromises);
            customerDocs.forEach(doc => customerCache[doc.id] = doc.data()?.displayName || 'Unknown');

            const shopkeeperDocs = await Promise.all(shopkeeperPromises);
            shopkeeperDocs.forEach(doc => shopkeeperCache[doc.id] = doc.data()?.displayName || 'Unknown');

            const transactionsWithNames = allTransactions.map(tx => ({
                ...tx,
                customerName: customerCache[tx.customerId as string],
                shopkeeperName: shopkeeperCache[tx.shopkeeperId as string],
            }));

            transactionsWithNames.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            
            setRecentTransactions(transactionsWithNames.slice(0, 5));
            setStats(prev => ({ ...prev, totalOutstanding, totalTransactionsToday: transactionsToday }));
            setLoading(false);
        });

        return () => {
            unsubCustomers();
            unsubShopkeepers();
            unsubTransactions();
        };

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
                        <StatCard title="Total Udhaar" value={`₹${Math.round(stats.totalOutstanding / 1000)}k`} icon={<IndianRupee size={28} />} colorClass="#ff3b5c" />
                    </div>
                </div>

                 <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Today's Snapshot</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard title="New Customers" value={`+${stats.newCustomersToday}`} icon={<TrendingUp size={28} />} colorClass="#00c896" />
                        <StatCard title="New Shops" value={`+${stats.newShopkeepersToday}`} icon={<TrendingUp size={28} />} colorClass="#00c896" />
                        <StatCard title="Transactions" value={`${stats.totalTransactionsToday}`} icon={<ArrowLeftRight size={28} />} colorClass="#6c757d" />
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
