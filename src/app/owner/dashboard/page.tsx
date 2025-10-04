'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Users, Store, IndianRupee, TrendingUp, TrendingDown, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
    amount: number;
    type: 'credit' | 'payment';
    timestamp: Timestamp;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    colorClass: string;
}

const StatCard = ({ title, value, icon, colorClass }: StatCardProps) => (
    <div className="login-card" style={{ padding: '20px', textAlign: 'center', flex: 1, minWidth: '140px' }}>
        <div className={`neu-icon ${colorClass}`} style={{ width: '60px', height: '60px', margin: '0 auto 15px', color: 'white' }}>
            {icon}
        </div>
        <h3 style={{ color: '#6c7293', fontSize: '14px', fontWeight: 600, margin: 0 }}>{title}</h3>
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
                    ₹{tx.amount.toLocaleString('en-IN')}
                </p>
                 <p style={{ fontSize: '12px', color: '#6c7293' }}>
                    {tx.timestamp?.toDate().toLocaleString('en-IN', { day: 'short', month: 'short', hour: 'numeric', minute: '2-digit' }) || 'now'}
                </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: isCredit ? '#ff3b5c' : '#00c896' }}>
                {isCredit ? 'Udhaar' : 'Payment'}
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
    });
    const [todayStats, setTodayStats] = useState({
        transactions: 0,
        udhaar: 0,
        payments: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<(Transaction & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser || !firestore) {
            setLoading(false);
            return;
        }
        setUser(auth.currentUser);

        const customersQuery = query(collection(firestore, 'customers'));
        const shopkeepersQuery = query(collection(firestore, 'shopkeepers'));
        const transactionsQuery = query(collection(firestore, 'transactions'), where('timestamp', '!=', null));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const unsubCustomers = onSnapshot(customersQuery, snapshot => setStats(prev => ({...prev, totalCustomers: snapshot.size})));
        const unsubShopkeepers = onSnapshot(shopkeepersQuery, snapshot => setStats(prev => ({...prev, totalShopkeepers: snapshot.size})));
        
        const unsubTransactions = onSnapshot(transactionsQuery, snapshot => {
            let totalOutstanding = 0;
            let todayTxCount = 0;
            let todayUdhaar = 0;
            let todayPayments = 0;

            const allTransactions: (Transaction & {id: string})[] = [];

            snapshot.forEach(doc => {
                const tx = { id: doc.id, ...doc.data() } as Transaction & {id: string};
                allTransactions.push(tx);

                if (tx.type === 'credit') {
                    totalOutstanding += tx.amount;
                } else if (tx.type === 'payment') {
                    totalOutstanding -= tx.amount;
                }

                if (tx.timestamp && tx.timestamp >= todayTimestamp) {
                    todayTxCount++;
                    if (tx.type === 'credit') {
                        todayUdhaar += tx.amount;
                    } else {
                        todayPayments += tx.amount;
                    }
                }
            });

            allTransactions.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            
            setRecentTransactions(allTransactions.slice(0, 5));
            setStats(prev => ({ ...prev, totalOutstanding }));
            setTodayStats({ transactions: todayTxCount, udhaar: todayUdhaar, payments: todayPayments });
            setLoading(false);
        });

        return () => {
            unsubCustomers();
            unsubShopkeepers();
            unsubTransactions();
        };

    }, [auth.currentUser, firestore]);
    
    const chartData = [
        { name: 'Today', Udhaar: todayStats.udhaar, Payments: todayStats.payments },
    ];


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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px' }}>
                        <StatCard title="Total Customers" value={stats.totalCustomers.toString()} icon={<Users size={28} />} colorClass="bg-blue-500" />
                        <StatCard title="Total Shopkeepers" value={stats.totalShopkeepers.toString()} icon={<Store size={28} />} colorClass="bg-purple-500" />
                        <StatCard title="Total Udhaar" value={`₹${Math.round(stats.totalOutstanding / 1000)}k`} icon={<IndianRupee size={28} />} colorClass="bg-red-500" />
                    </div>
                </div>

                 <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Today's Snapshot</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard title="Udhaar Given" value={`₹${(todayStats.udhaar / 1000).toFixed(1)}k`} icon={<TrendingUp size={28} />} colorClass="bg-orange-500" />
                        <StatCard title="Payments Rec'd" value={`₹${(todayStats.payments / 1000).toFixed(1)}k`} icon={<TrendingDown size={28} />} colorClass="bg-green-500" />
                         <StatCard title="Transactions" value={todayStats.transactions.toString()} icon={<ArrowLeftRight size={28} />} colorClass="bg-gray-500" />
                    </div>
                    <div style={{ height: '200px' }}>
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#d1d9e6" />
                                <XAxis dataKey="name" tick={{ fill: '#6c7293', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#6c7293', fontSize: 12 }} tickFormatter={(value) => `₹${Number(value) / 1000}k`}/>
                                <Tooltip
                                    contentStyle={{ background: '#e0e5ec', border: 'none', borderRadius: '15px', boxShadow: '5px 5px 15px #bec3cf, -5px -5px 15px #ffffff' }}
                                    formatter={(value) => [`₹${value}`, null]}
                                />
                                <Legend wrapperStyle={{ fontSize: '14px', color: '#3d4468' }} />
                                <Bar dataKey="Udhaar" fill="#ff3b5c" radius={[10, 10, 0, 0]} />
                                <Bar dataKey="Payments" fill="#00c896" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                <div className="login-card">
                    <h2 style={{ textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px' }}>Recent Transactions</h2>
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
