
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, writeBatch, Timestamp, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Send, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';

interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface ShopkeeperProfile {
    uid: string;
    displayName: string;
    defaultCreditLimit?: number;
    creditSettings?: { [key: string]: { limitType: 'default' | 'manual', manualLimit: number, isCreditEnabled: boolean } };
}

interface Transaction {
  id: string;
  type: 'credit' | 'payment';
  amount: number;
  timestamp: Timestamp;
  notes?: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [shopkeeperProfile, setShopkeeperProfile] = useState<ShopkeeperProfile | null>(null);
  const [shopkeeperBalance, setShopkeeperBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionType, setTransactionType] = useState<'credit' | 'payment' | null>(null);

  // State for limit modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitModalError, setLimitModalError] = useState('');

  useEffect(() => {
    if (!customerId || !auth.currentUser) {
      router.push('/shopkeeper/customers');
      return;
    }

    const fetchCustomerProfile = async () => {
      const customerRef = doc(firestore, 'customers', customerId);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        setCustomer({ uid: customerId, ...customerSnap.data() } as CustomerProfile);
      } else {
        router.push('/shopkeeper/customers');
      }
    };
    
    fetchCustomerProfile();

    const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeBalance = onSnapshot(shopkeeperRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { uid: docSnap.id, ...docSnap.data()} as ShopkeeperProfile;
        setShopkeeperProfile(data);
        const balances = (data as any).balances || {};
        setShopkeeperBalance(balances[customerId] || 0);
      }
      setLoading(false);
    });

    const transRef = collection(firestore, 'transactions');
    const q = query(
      transRef,
      where('customerId', '==', customerId),
      where('shopkeeperId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const trans: Transaction[] = [];
      snapshot.forEach(doc => {
        trans.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(trans);
    });

    return () => {
      unsubscribeBalance();
      unsubscribeTransactions();
    };

  }, [customerId, firestore, auth.currentUser, router]);

  const evaluateExpression = (expr: string): string => {
    // Sanitize the expression: allow numbers, operators, and decimal points.
    const sanitizedExpr = expr.replace(/[^0-9+\-*/.]/g, '');
    
    // Avoid evaluation of unsafe expressions
    if (sanitizedExpr !== expr) {
      return '';
    }
    
    // Do not evaluate if the expression is empty or ends with an operator
    if (!sanitizedExpr || /[+\-*/.]$/.test(sanitizedExpr)) {
      return sanitizedExpr;
    }

    try {
      // Using Function constructor is safer than eval()
      const result = new Function(`return ${sanitizedExpr}`)();
      if (typeof result === 'number' && !isNaN(result)) {
        // Round to 2 decimal places if it's a float
        return String(Math.round(result * 100) / 100);
      }
      return sanitizedExpr;
    } catch (error) {
      // If there's an error in evaluation, return the original sanitized expression
      return sanitizedExpr;
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow users to type expressions
    setAmount(value);
  };
  
  const handleAmountBlur = () => {
      const evaluatedValue = evaluateExpression(amount);
      setAmount(evaluatedValue);
  }
  
  const handleTransaction = async (type: 'credit' | 'payment') => {
    // Ensure the final value is evaluated before processing
    const finalAmountStr = evaluateExpression(amount);
    const transactionAmount = parseFloat(finalAmountStr);

    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    if(!auth.currentUser || !customer || !shopkeeperProfile) {
        alert("Authentication error.");
        return;
    }
    
    if (type === 'credit') {
        const customerSettings = shopkeeperProfile.creditSettings?.[customer.uid];
        const isCreditEnabled = customerSettings?.isCreditEnabled ?? true;

        if (!isCreditEnabled) {
            alert("Credit is disabled for this customer. Please enable it in the Control Room to give credit.");
            return;
        }

        const creditLimit = customerSettings?.limitType === 'manual' 
            ? customerSettings.manualLimit 
            : shopkeeperProfile.defaultCreditLimit ?? 1000;
        
        const currentBalance = shopkeeperBalance || 0;

        if (currentBalance + transactionAmount > creditLimit) {
            alert(`This transaction exceeds the customer's credit limit of ₹${creditLimit}. You cannot give more credit.`);
            setShowLimitModal(true); // Show the increase limit modal
            return; // IMPORTANT: Stop the transaction here
        }
    }

    setTransactionType(type);
    setIsProcessing(true);

    try {
        const batch = writeBatch(firestore);
        const shopkeeperId = auth.currentUser.uid;
        
        const transactionRef = doc(collection(firestore, 'transactions'));
        batch.set(transactionRef, {
            amount: transactionAmount,
            type: type,
            notes: notes,
            shopkeeperId: shopkeeperId,
            customerId: customerId,
            timestamp: serverTimestamp(),
        });
        
        const balanceChange = type === 'credit' ? transactionAmount : -transactionAmount;
        
        const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
        const customerRef = doc(firestore, 'customers', customerId);

        const newShopkeeperBalance = shopkeeperBalance + balanceChange;

        const customerDoc = await getDoc(customerRef);
        const customerBalances = customerDoc.data()?.balances || {};
        const newCustomerBalance = (customerBalances[shopkeeperId] || 0) + balanceChange;
        
        batch.set(shopkeeperRef, { balances: { [customerId]: newShopkeeperBalance } }, { merge: true });
        batch.set(customerRef, { balances: { [shopkeeperId]: newCustomerBalance } }, { merge: true });

        await batch.commit();

        setAmount('');
        setNotes('');

    } catch (error) {
        console.error("Transaction failed:", error);
        alert("An error occurred. Please try again.");
    } finally {
        setIsProcessing(false);
        setTransactionType(null);
    }
  }

  const handleSaveNewLimit = async () => {
      setLimitModalError('');
      const limitVal = parseFloat(newLimit);
      if (isNaN(limitVal) || limitVal <= 0) {
          setLimitModalError("Please enter a valid positive limit.");
          return;
      }
      if (!auth.currentUser || !customer) return;

      setIsSavingLimit(true);
      try {
          const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
          // Get the existing settings or create a default structure
          const existingSettings = shopkeeperProfile?.creditSettings?.[customer.uid] || { isCreditEnabled: true, limitType: 'default', manualLimit: 0};
          
          await updateDoc(shopkeeperRef, {
              [`creditSettings.${customer.uid}`]: {
                  ...existingSettings,
                  limitType: 'manual',
                  manualLimit: limitVal,
              }
          });

          setShowLimitModal(false);
          setNewLimit('');
          alert(`Credit limit for ${customer.displayName} updated to ₹${limitVal}. You can now proceed with the transaction.`);
      } catch (err) {
          setLimitModalError("Failed to update limit. Please try again.");
      } finally {
          setIsSavingLimit(false);
      }
  };


  const balanceColor = shopkeeperBalance > 0 ? '#ff3b5c' : '#00c896';
  const balanceText = shopkeeperBalance > 0 ? 'Udhaar' : (shopkeeperBalance < 0 ? 'Advance' : 'Settled');
  
  const customerSettings = shopkeeperProfile?.creditSettings?.[customerId];
  const currentCreditLimit = customerSettings?.limitType === 'manual'
      ? customerSettings.manualLimit
      : shopkeeperProfile?.defaultCreditLimit ?? 1000;


  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!customer) {
    return <div className="loading-container">Customer not found.</div>;
  }

  return (
    <>
      {showLimitModal && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <div className="neu-icon" style={{background: '#ffc107', color: 'white', margin: '0 15px 0 0', width: '60px', height: '60px'}}><AlertTriangle size={30}/></div>
                  <h2 style={{fontSize: '1.5rem'}}>Credit Limit Reached</h2>
              </div>
              <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '25px', lineHeight: 1.7}}>
                  {customer.displayName} has reached their credit limit of <strong>₹{currentCreditLimit}</strong>. To continue, you can increase their limit.
              </p>

              <div className="form-group">
                  <div className="neu-input">
                      <input type="number" id="new-limit" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} placeholder=" " required />
                      <label htmlFor="new-limit">New Credit Limit (₹)</label>
                      <div className="input-icon"><IndianRupee /></div>
                  </div>
              </div>
              {limitModalError && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{limitModalError}</p>}
              
              <div style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
                  <button className="neu-button" onClick={() => setShowLimitModal(false)} style={{margin:0, flex: 1}}>Cancel</button>
                  <button className={`neu-button ${isSavingLimit ? 'loading' : ''}`} onClick={handleSaveNewLimit} disabled={isSavingLimit} style={{margin:0, flex: 1, background: '#00c896', color: 'white'}}>
                      <span className="btn-text">Save New Limit</span>
                      <div className="btn-loader"><div className="neu-spinner"></div></div>
                  </button>
              </div>
          </div>
        </div>
      )}

      <div style={{ paddingBottom: '80px' }}>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
          <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
            <ArrowLeft size={20} />
          </button>
          <div style={{textAlign: 'center', flexGrow: 1}}>
            <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>{customer.displayName}</h1>
            <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>{customer.email}</p>
          </div>
          <div className="user-avatar neu-icon" style={{width: '45px', height: '45px', margin: 0, flexShrink: 0}}>
            {customer.photoURL ? (
                <img src={customer.photoURL} alt={customer.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
            ) : (
                <User size={24} />
            )}
          </div>
        </header>

        <main className="dashboard-main-content" style={{padding: '20px'}}>
          <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '30px' }}>
              <div style={{textAlign: 'center'}}>
                  <p style={{fontSize: '0.9rem', color: '#6c7293', margin: 0, fontWeight: 500}}>Customer's Balance</p>
                  <p style={{fontSize: '3rem', fontWeight: 'bold', margin: '5px 0', color: balanceColor}}>₹{Math.abs(shopkeeperBalance)}</p>
                  <p style={{fontSize: '0.9rem', fontWeight: 600, color: balanceColor}}>{balanceText}</p>
              </div>
          </div>

          <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '40px' }}>
              <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>New Transaction</h2>
              <div className="form-group">
                  <div className="neu-input">
                      <div className="input-icon"><IndianRupee /></div>
                      <input
                          type="text"
                          placeholder=" "
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          onBlur={handleAmountBlur}
                          style={{paddingLeft: '55px', fontSize: '1.2rem'}}
                      />
                      <label htmlFor="amount">Enter Amount (e.g. 10+25)</label>
                  </div>
              </div>
              <div className="form-group" style={{marginBottom: '30px'}}>
                  <div className="neu-input">
                      <input
                          type="text"
                          placeholder=" "
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                      />
                      <label htmlFor="notes">Notes (e.g., 1kg Sugar)</label>
                  </div>
              </div>
              
              <div style={{display: 'flex', gap: '20px'}}>
                  <button 
                      className={`neu-button ${isProcessing && transactionType === 'credit' ? 'loading' : ''}`} 
                      style={{margin: 0, background: '#ff3b5c', color: 'white'}}
                      onClick={() => handleTransaction('credit')}
                      disabled={isProcessing}
                      >
                      <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><MinusCircle size={18}/> Give Credit (Udhaar)</span>
                      <div className="btn-loader"><div className="neu-spinner"></div></div>
                  </button>
                  <button 
                      className={`neu-button ${isProcessing && transactionType === 'payment' ? 'loading' : ''}`} 
                      style={{margin: 0, background: '#00c896', color: 'white'}}
                      onClick={() => handleTransaction('payment')}
                      disabled={isProcessing}
                      >
                      <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><PlusCircle size={18}/> Receive Payment</span>
                      <div className="btn-loader"><div className="neu-spinner"></div></div>
                  </button>
              </div>
          </div>

          <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
              <h2 style={{textAlign: 'center', color: '#3d4468', fontWeight: 600, fontSize: '1.5rem', marginBottom: '25px'}}>Transaction History</h2>
              {transactions.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      {transactions.map(tx => (
                          <div key={tx.id} className="neu-input" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', boxShadow: 'none' }}>
                              <div>
                                  <p style={{fontWeight: 600, color: tx.type === 'credit' ? '#ff3b5c' : '#00c896', textTransform: 'capitalize', marginBottom: '4px'}}>
                                      {tx.type === 'credit' ? 'Udhaar Added' : 'Payment Received'}
                                  </p>
                                  {tx.notes && <p style={{fontSize: '13px', color: '#6c7293', marginBottom: '8px'}}>Notes: {tx.notes}</p>}
                                  <p style={{fontSize: '12px', color: '#9499b7'}}>
                                      {tx.timestamp.toDate().toLocaleString()}
                                  </p>
                              </div>
                              <p style={{fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'credit' ? '#ff3b5c' : '#00c896'}}>
                                  ₹{tx.amount}
                              </p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <p style={{textAlign: 'center', color: '#9499b7'}}>No transactions with this customer yet.</p>
              )}
          </div>
        </main>
      </div>
    </>
  );
}
