'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, collection, query, where, Timestamp } from 'firebase/firestore';
import { SlidersHorizontal, IndianRupee, Save, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommissionAnalytics {
    totalEarned: number;
    pendingOnCredit: number;
    earned24h: number;
    earned30d: number;
}

export default function OwnerControlPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [commissionRate, setCommissionRate] = useState(2.5);
    const [newRate, setNewRate] = useState('2.5');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [analytics, setAnalytics] = useState<CommissionAnalytics>({ totalEarned: 0, pendingOnCredit: 0, earned24h: 0, earned30d: 0 });
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        // Listener for settings
        const settingsRef = doc(firestore, 'settings', 'platform');
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const rate = docSnap.data().commissionRate || 2.5;
                setCommissionRate(rate);
                setNewRate(rate.toString());
            } else {
                // If doc doesn't exist, create it with default
                setDoc(settingsRef, { commissionRate: 2.5 });
            }
            setLoading(false);
        });

        // Listener for analytics
        const transRef = collection(firestore, 'transactions');
        const unsubTransactions = onSnapshot(transRef, (snapshot) => {
            setLoadingAnalytics(true);
            let totalEarned = 0;
            let earned24h = 0;
            let earned30d = 0;
            let totalCreditPrincipal = 0;
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

            snapshot.forEach(doc => {
                const tx = doc.data();
                const txTimestamp = tx.timestamp?.toDate();

                if (tx.type === 'commission' && tx.profit) {
                    totalEarned += tx.profit;
                    if (txTimestamp >= twentyFourHoursAgo) {
                        earned24h += tx.profit;
                    }
                    if (txTimestamp >= thirtyDaysAgo) {
                        earned30d += tx.profit;
                    }
                }
                
                if (tx.type === 'credit') {
                    totalCreditPrincipal += tx.amount;
                } else if (tx.type === 'payment') {
                    // Reduce principal from credit when payment is made
                    totalCreditPrincipal -= tx.amount; 
                }
            });
            
            // Pending commission is on the net outstanding credit
            const pendingOnCredit = (totalCreditPrincipal > 0 ? totalCreditPrincipal : 0) * (commissionRate / 100);

            setAnalytics({
                totalEarned,
                pendingOnCredit,
                earned24h,
                earned30d,
            });
            setLoadingAnalytics(false);
        });

        return () => {
            unsubSettings();
            unsubTransactions();
        };
    }, [firestore, commissionRate]);

    const handleSaveRate = async () => {
        const rateValue = parseFloat(newRate);
        if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
            toast({ variant: 'destructive', title: 'Invalid Rate', description: 'Please enter a valid percentage between 0 and 100.' });
            return;
        }

        setIsSaving(true);
        try {
            const settingsRef = doc(firestore, 'settings', 'platform');
            await updateDoc(settingsRef, { commissionRate: rateValue });
            toast({ title: 'Success', description: `Commission rate updated to ${rateValue}%.` });
        } catch (error) {
            console.error("Error updating commission rate:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update commission rate.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const StatCard = ({ title, value, icon, colorClass = 'text-primary' }: {title: string, value: string, icon: React.ReactNode, colorClass?: string}) => (
        <div className="neu-input" style={{ padding: '20px', textAlign: 'center' }}>
            <div className={`neu-icon`} style={{ width: '50px', height: '50px', margin: '0 auto 10px', boxShadow: 'none', background: 'transparent' }}>
                {icon}
            </div>
            <p style={{ color: '#6c7293', fontSize: '13px', fontWeight: 500, margin: 0, textTransform: 'uppercase' }}>{title}</p>
            <p style={{ color: '#3d4468', fontSize: '1.5rem', fontWeight: 700, margin: '5px 0 0 0' }}>{value}</p>
        </div>
    );

    return (
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div className="login-card" style={{ maxWidth: '700px', margin: 'auto' }}>
                <div className="login-header" style={{ marginBottom: '30px' }}>
                    <div className="neu-icon"><div className="icon-inner"><SlidersHorizontal /></div></div>
                    <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Platform Control</h1>
                    <p style={{ color: '#6c7293' }}>Manage global settings for the Udhar Pay platform.</p>
                </div>
                
                {/* Commission Rate Section */}
                <div className="setting-section" style={{marginBottom: '40px'}}>
                    <h3 className="setting-title" style={{textAlign: 'center', borderBottom: 'none', fontSize: '1.2rem', paddingBottom: 0}}>Commission Rate</h3>
                    <p style={{textAlign: 'center', color: '#9499b7', marginTop: '-10px', marginBottom: '30px'}}>Set the platform-wide commission percentage on credit transactions.</p>
                    {loading ? <div className="neu-spinner mx-auto"></div> : (
                        <div className="form-group" style={{maxWidth: '300px', margin: 'auto'}}>
                            <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                                <input
                                    type="number"
                                    id="commission-rate"
                                    value={newRate}
                                    onChange={(e) => setNewRate(e.target.value)}
                                    placeholder=" "
                                    style={{fontSize: '1.2rem', textAlign: 'center', paddingRight: '40px'}}
                                />
                                <label htmlFor="commission-rate">Commission Rate (%)</label>
                                 <div className="input-icon" style={{ right: '20px', left: 'auto', fontSize: '1.2rem', color: '#6c7293' }}>%</div>
                            </div>
                            <button onClick={handleSaveRate} className={`neu-button ${isSaving ? 'loading' : ''}`} disabled={isSaving} style={{marginTop: '20px'}}>
                                <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Save size={18}/> Save New Rate</span>
                                 <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Commission Analytics Section */}
                <div className="setting-section">
                    <h3 className="setting-title" style={{textAlign: 'center', borderBottom: 'none', fontSize: '1.2rem', paddingBottom: 0, marginBottom: '30px'}}>Commission Analytics</h3>
                    {loadingAnalytics ? <div className="neu-spinner mx-auto"></div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <StatCard title="Total Earned" value={`₹${analytics.totalEarned.toLocaleString('en-IN', {maximumFractionDigits: 2})}`} icon={<Wallet size={28} className="text-green-500" />} />
                            <StatCard title="Pending on Credit" value={`₹${analytics.pendingOnCredit.toLocaleString('en-IN', {maximumFractionDigits: 2})}`} icon={<IndianRupee size={28} className="text-yellow-500"/>} />
                            <StatCard title="Earned (24h)" value={`₹${analytics.earned24h.toLocaleString('en-IN', {maximumFractionDigits: 2})}`} icon={<TrendingUp size={28} className="text-blue-500"/>} />
                            <StatCard title="Earned (30d)" value={`₹${analytics.earned30d.toLocaleString('en-IN', {maximumFractionDigits: 2})}`} icon={<TrendingUp size={28} className="text-purple-500"/>} />
                        </div>
                    )}
                </div>
                 <div style={{ padding: '15px 20px', background: '#eef2ff', borderRadius: '15px', border: '1px solid #c7d2fe', display: 'flex', gap: '15px', alignItems: 'center', marginTop: '30px' }}>
                    <AlertCircle className="text-indigo-500" size={32} />
                    <div>
                        <h4 style={{ color: '#4338ca', fontWeight: 'bold' }}>एनालिटिक्स पर ध्यान दें</h4>
                        <p style={{ color: '#4f46e5', margin: 0, fontSize: '13px' }}>
                            यह सभी आँकड़े रियल-टाइम में लेन-देन के आधार पर दिखते हैं। "बकाया उधार पर कमीशन" एक अनुमान है जो यह बताता है कि मौजूदा उधार पर वर्तमान कमीशन रेट के हिसाब से कितनी कमाई होगी।
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
