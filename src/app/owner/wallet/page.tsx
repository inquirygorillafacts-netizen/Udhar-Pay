'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, where, getDocs, Timestamp, writeBatch, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { IndianRupee, Users, Store, CheckSquare, Clock, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface WalletStats {
    totalSettled: number;
    pendingSettlements: number;
    totalPayingCustomers: number;
    payingCustomers24h: number;
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
    isPaid?: boolean;
    parentCreditId?: string;
    shopkeeperId: string;
    commissionRate?: number;
    timestamp: Timestamp; 
}

export default function OwnerWalletPage() {
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();

    const [stats, setStats] = useState<WalletStats>({
        totalSettled: 0,
        pendingSettlements: 0,
        totalPayingCustomers: 0,
        payingCustomers24h: 0,
    });
    const [pendingTransactions, setPendingTransactions] = useState<PendingSettlement[]>([]);
    const [loading, setLoading] = useState(true);

    // Settlement Modal State
    const [settlementModal, setSettlementModal] = useState<{ isOpen: boolean; shopkeeper: PendingSettlement | null }>({ isOpen: false, shopkeeper: null });
    const [settlementAmount, setSettlementAmount] = useState('');
    const [settlementMethod, setSettlementMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | null>(null);
    const [settlementRefId, setSettlementRefId] = useState('');
    const [isSettling, setIsSettling] = useState(false);
    const [settlementError, setSettlementError] = useState('');

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        
        const transQuery = query(collection(firestore, 'transactions'));
        
        const unsubscribe = onSnapshot(transQuery, async (snapshot) => {
            const shopkeeperSettlements: { [key: string]: number } = {};
            const totalPayingCustomers = new Set<string>();
            const payingCustomersIn24h = new Set<string>();
            let totalSettledAmount = 0;

            const transactions = snapshot.docs.map(d => d.data() as Transaction);
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            for (const tx of transactions) {
                if (tx.type === 'payment') {
                    totalPayingCustomers.add(tx.customerId);
                    
                    const txTimestamp = tx.timestamp?.toDate();
                    if (txTimestamp && txTimestamp >= twentyFourHoursAgo) {
                        payingCustomersIn24h.add(tx.customerId);
                    }
                    
                    const commissionRate = tx.commissionRate || 2.5;
                    const principalAmount = tx.amount / (1 + (commissionRate / 100));

                    if (tx.isPaid === false) { // Only count unsettled payments
                        if (shopkeeperSettlements[tx.shopkeeperId]) {
                            shopkeeperSettlements[tx.shopkeeperId] += principalAmount;
                        } else {
                            shopkeeperSettlements[tx.shopkeeperId] = principalAmount;
                        }
                    } else { // This payment has been settled to the shopkeeper
                        totalSettledAmount += principalAmount;
                    }
                }
            }

            const totalPending = Object.values(shopkeeperSettlements).reduce((sum, amount) => sum + amount, 0);
            
            setStats({
                pendingSettlements: totalPending,
                totalSettled: totalSettledAmount,
                totalPayingCustomers: totalPayingCustomers.size,
                payingCustomers24h: payingCustomersIn24h.size,
            });

            const shopkeeperIds = Object.keys(shopkeeperSettlements);
            if (shopkeeperIds.length > 0) {
                const shopkeepersRef = collection(firestore, 'shopkeepers');
                const qShopkeepers = query(shopkeepersRef, where('__name__', 'in', shopkeeperIds));
                const shopkeepersSnap = await getDocs(qShopkeepers);
                
                const pendingList: PendingSettlement[] = [];
                shopkeepersSnap.forEach(shopDoc => {
                    const shopData = shopDoc.data();
                    const amount = shopkeeperSettlements[shopDoc.id];
                    
                    if (amount > 0) {
                        pendingList.push({
                            shopkeeperId: shopDoc.id,
                            shopkeeperName: shopData.displayName || 'Unknown Shopkeeper',
                            photoURL: shopData.photoURL,
                            amount: amount,
                        });
                    }
                });
                pendingList.sort((a, b) => b.amount - a.amount);
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
    
    const openSettleModal = (shopkeeper: PendingSettlement) => {
        setSettlementModal({ isOpen: true, shopkeeper });
        setSettlementAmount(shopkeeper.amount.toFixed(2));
        setSettlementMethod(null);
        setSettlementRefId('');
        setSettlementError('');
    };

    const closeSettleModal = () => {
        setSettlementModal({ isOpen: false, shopkeeper: null });
        setIsSettling(false);
    };

    const handleConfirmSettlement = async () => {
        setSettlementError('');
        const amount = parseFloat(settlementAmount);
        if (!settlementModal.shopkeeper || isNaN(amount) || amount <= 0) {
            setSettlementError('Please enter a valid amount.');
            return;
        }
        if (!settlementMethod) {
            setSettlementError('Please select a settlement method.');
            return;
        }
        if (!settlementRefId) {
            setSettlementError('Please enter a Transaction ID or Note.');
            return;
        }
        
        setIsSettling(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Create a settlement record
            const settlementRef = doc(collection(firestore, 'settlements'));
            batch.set(settlementRef, {
                shopkeeperId: settlementModal.shopkeeper.shopkeeperId,
                amountSettled: amount,
                method: settlementMethod,
                transactionId: settlementRefId,
                settledAt: serverTimestamp(),
                settledBy: auth.currentUser?.uid,
            });

            // 2. Find and update the relevant 'payment' transactions
            const paymentsQuery = query(
                collection(firestore, 'transactions'),
                where('shopkeeperId', '==', settlementModal.shopkeeper.shopkeeperId),
                where('type', '==', 'payment'),
                where('isPaid', '==', false)
            );
            const paymentsToSettle = await getDocs(paymentsQuery);
            paymentsToSettle.forEach(paymentDoc => {
                batch.update(paymentDoc.ref, { isPaid: true });
            });
            
            await batch.commit();

            toast({ title: "Settlement Recorded!", description: `₹${amount} has been marked as settled for ${settlementModal.shopkeeper.shopkeeperName}.` });
            closeSettleModal();

        } catch (error) {
            console.error("Error confirming settlement:", error);
            setSettlementError('Failed to record settlement. Please try again.');
        } finally {
            setIsSettling(false);
        }
    };
    

  return (
    <>
      {settlementModal.isOpen && settlementModal.shopkeeper && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '480px'}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{fontSize: '1.5rem'}}>Settle Payment</h2>
              <button className="close-button" onClick={closeSettleModal}>&times;</button>
            </div>
            <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px'}}>
              You are settling payment for <strong>{settlementModal.shopkeeper.shopkeeperName}</strong>.
            </p>

            <div className="form-group">
              <div className="neu-input">
                <input type="number" id="amount" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} required placeholder=" "/>
                <label htmlFor="amount">Amount to Settle (₹)</label>
                <div className="input-icon"><IndianRupee /></div>
              </div>
            </div>

            <div className="form-group">
              <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1rem', paddingBottom: 0}}>Settlement Method</h3>
              <RadioGroup onValueChange={(value: 'UPI' | 'Bank Transfer' | 'Cash') => setSettlementMethod(value)} value={settlementMethod ?? ''} className="flex justify-center gap-4 my-4">
                  <Label htmlFor="upi" className={`neu-button ${settlementMethod === 'UPI' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px'}}>
                      <RadioGroupItem value="UPI" id="upi" className="sr-only" />
                      UPI
                  </Label>
                  <Label htmlFor="bank" className={`neu-button ${settlementMethod === 'Bank Transfer' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px'}}>
                      <RadioGroupItem value="Bank Transfer" id="bank" className="sr-only" />
                      Bank
                  </Label>
                  <Label htmlFor="cash" className={`neu-button ${settlementMethod === 'Cash' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px'}}>
                      <RadioGroupItem value="Cash" id="cash" className="sr-only" />
                      Cash
                  </Label>
              </RadioGroup>
            </div>

            <div className="form-group">
              <div className="neu-input">
                  <input type="text" id="refId" value={settlementRefId} onChange={(e) => setSettlementRefId(e.target.value)} required placeholder=" "/>
                  <label htmlFor="refId">Transaction ID / Note</label>
              </div>
            </div>

            {settlementError && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{settlementError}</p>}
            
            <button onClick={handleConfirmSettlement} className={`neu-button ${isSettling ? 'loading' : ''}`} disabled={isSettling} style={{marginTop: '20px', background: '#00c896', color: 'white'}}>
                <span className="btn-text">Confirm Settlement</span>
                <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
          </div>
        </div>
      )}
      <main className="dashboard-main-content" style={{ padding: '20px' }}>
          <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
              <div className="login-header" style={{marginBottom: '40px'}}>
                  <div className="neu-icon" style={{width: '70px', height: '70px'}}>
                      <div className="icon-inner"><Banknote/></div>
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
                              <p style={{ color: '#00c896', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>₹{stats.totalSettled.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                          <div className="neu-input" style={{ padding: '20px' }}>
                               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                                   <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Paying Customers</p>
                                   <span style={{fontSize: '12px', color: '#9499b7'}}>Total</span>
                               </div>
                              <p style={{ color: '#3d4468', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>{stats.totalPayingCustomers}</p>
                          </div>
                           <div className="neu-input" style={{ padding: '20px' }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                                   <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Paying Customers</p>
                                   <span style={{fontSize: '12px', color: '#9499b7'}}>24h</span>
                               </div>
                              <p style={{ color: '#3d4468', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>{stats.payingCustomers24h}</p>
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
                                      <div style={{textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px'}}>
                                          <p style={{fontWeight: 'bold', fontSize: '1.5rem', color: '#3d4468'}}>₹{tx.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                          <button onClick={() => openSettleModal(tx)} className="neu-button" style={{margin: 0, padding: '10px 20px', width: 'auto', background: '#00c896', color: 'white'}}>
                                            Settle Now
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
    </>
  );
}
