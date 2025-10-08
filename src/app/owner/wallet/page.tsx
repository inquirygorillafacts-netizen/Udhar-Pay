'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { IndianRupee, Users, Store, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WalletStats {
    totalSettled: number;
    pendingSettlements: number;
    totalPayingCustomers: number;
}

interface PendingSettlement {
    shopkeeperId: string;
    shopkeeperName: string;
    photoURL?: string;
    amount: number;
}

interface Transaction {
    amount: number;
    type: 'credit' | 'payment' | 'commission';
    customerId: string;
    isPaid?: boolean; // For commission
    parentCreditId?: string; // For commission
    shopkeeperId: string;
    commissionRate?: number; // For payment
}


export default function OwnerWalletPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [stats, setStats] = useState<WalletStats>({
        totalSettled: 0,
        pendingSettlements: 0,
        totalPayingCustomers: 0,
    });
    const [pendingTransactions, setPendingTransactions] = useState<PendingSettlement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        
        const transQuery = query(collection(firestore, 'transactions'));
        
        const unsubscribe = onSnapshot(transQuery, async (snapshot) => {
            const shopkeeperSettlements: { [key: string]: number } = {};
            const payingCustomers = new Set<string>();

            const transactions = snapshot.docs.map(d => d.data() as Transaction);

            for (const tx of transactions) {
                if (tx.type === 'payment') {
                    payingCustomers.add(tx.customerId);
                    // This logic mirrors the one in the ecosystem page to ensure consistency
                    const commissionRate = tx.commissionRate || 2.5;
                    const principalAmount = tx.amount / (1 + (commissionRate / 100));

                    if (shopkeeperSettlements[tx.shopkeeperId]) {
                        shopkeeperSettlements[tx.shopkeeperId] += principalAmount;
                    } else {
                        shopkeeperSettlements[tx.shopkeeperId] = principalAmount;
                    }
                }
            }

            const totalPending = Object.values(shopkeeperSettlements).reduce((sum, amount) => sum + amount, 0);
            
            setStats(prev => ({
                ...prev,
                pendingSettlements: totalPending,
                totalPayingCustomers: payingCustomers.size,
            }));

            // Fetch shopkeeper details for pending settlements
            const shopkeeperIds = Object.keys(shopkeeperSettlements);
            if (shopkeeperIds.length > 0) {
                const shopkeepersRef = collection(firestore, 'shopkeepers');
                const qShopkeepers = query(shopkeepersRef, where('__name__', 'in', shopkeeperIds));
                const shopkeepersSnap = await getDocs(qShopkeepers);
                
                const pendingList: PendingSettlement[] = [];
                shopkeepersSnap.forEach(shopDoc => {
                    const shopData = shopDoc.data();
                    const amount = shopkeeperSettlements[shopDoc.id];
                    // Subtract any amount already settled from the shopkeeper's document if that logic exists
                    const pendingAmount = amount - (shopData.settledAmount || 0);
                    if (pendingAmount > 0) {
                        pendingList.push({
                            shopkeeperId: shopDoc.id,
                            shopkeeperName: shopData.displayName || 'Unknown Shopkeeper',
                            photoURL: shopData.photoURL,
                            amount: pendingAmount,
                        });
                    }
                });
                setPendingTransactions(pendingList);
            } else {
                setPendingTransactions([]);
            }

            setLoading(false);
        }, (error) => {
            console.error("Error fetching wallet data: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load wallet data.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, toast]);
    
    const handleMarkAsSettled = (shopkeeperId: string) => {
        toast({
            title: 'Feature In Progress',
            description: `Settlement for this shopkeeper will be implemented soon.`
        })
    }

  return (
    <main className="dashboard-main-content" style={{ padding: '20px' }}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '40px'}}>
                <div className="neu-icon" style={{width: '70px', height: '70px'}}>
                    <div className="icon-inner"><IndianRupee/></div>
                </div>
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
                    Platform Wallet & Settlements
                </h1>
                <p style={{ color: '#6c7293', marginTop: '1rem' }}>
                    Monitor incoming payments and manage shopkeeper settlements.
                </p>
            </div>

             {loading ? (
                <div className="loading-container" style={{minHeight: '200px'}}><div className="neu-spinner"></div></div>
             ) : (
                <>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        <div className="neu-input" style={{ padding: '20px' }}>
                            <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Pending Settlements</p>
                            <p style={{ color: '#ff3b5c', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>₹{stats.pendingSettlements.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="neu-input" style={{ padding: '20px' }}>
                            <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Settled</p>
                            <p style={{ color: '#00c896', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>₹{stats.totalSettled.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="neu-input" style={{ padding: '20px' }}>
                            <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Paying Customers</p>
                            <p style={{ color: '#3d4468', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>{stats.totalPayingCustomers}</p>
                        </div>
                    </div>

                    {/* Pending Settlements List */}
                    <div>
                         <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '30px' }}>
                            Pending Settlements to Shopkeepers
                        </h2>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {pendingTransactions.length > 0 ? pendingTransactions.map(tx => (
                                <div key={tx.shopkeeperId} className="neu-input" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '5px 5px 15px #bec3cf, -5px -5px 15px #ffffff' }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                        <div className="neu-icon" style={{width: '50px', height: '50px', margin: 0}}>
                                            {tx.photoURL ? <img src={tx.photoURL} alt={tx.shopkeeperName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}}/> : <Store size={24}/>}
                                        </div>
                                        <div>
                                            <p style={{fontWeight: 600, color: '#3d4468'}}>{tx.shopkeeperName}</p>
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <p style={{fontWeight: 'bold', fontSize: '1.5rem', color: '#3d4468'}}>₹{tx.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        <button onClick={() => handleMarkAsSettled(tx.shopkeeperId)} className="neu-button" style={{padding: '8px 16px', fontSize: '13px', margin: 0, marginTop: '8px', background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <CheckSquare size={16}/> Mark as Settled
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p style={{textAlign: 'center', color: '#9499b7'}}>No pending settlements right now.</p>
                            )}
                         </div>
                    </div>
                </>
             )}
        </div>
    </main>
  );
}
