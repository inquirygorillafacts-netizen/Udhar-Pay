'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { collection, onSnapshot, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { Network, ChevronRight, User, Search, Users, QrCode, IndianRupee, Edit, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

interface Shopkeeper {
  uid: string;
  displayName: string;
  photoURL?: string;
  pendingSettlement: number;
  shopkeeperCode?: string;
  qrCodeUrl?: string;
  mobileNumber?: string;
}

interface Transaction {
    type: 'payment';
    amount: number;
    shopkeeperId: string;
}

const COMMISSION_RATE = 0.025;

export default function EcosystemPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [allShopkeepers, setAllShopkeepers] = useState<Shopkeeper[]>([]);
  const [filteredShopkeepers, setFilteredShopkeepers] = useState<Shopkeeper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [viewingQr, setViewingQr] = useState<string | null>(null);
  const [editingShopkeeper, setEditingShopkeeper] = useState<Shopkeeper | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

   useEffect(() => {
    if (!firestore) return;

    let unsubShopkeepers: () => void;
    let unsubTransactions: () => void;

    const fetchAndCalculate = () => {
      setLoading(true);
      const shopkeepersRef = collection(firestore, 'shopkeepers');
      const transactionsRef = collection(firestore, 'transactions');
      const qPayments = query(transactionsRef, where('type', '==', 'payment'));

      let shopkeepersData: Omit<Shopkeeper, 'pendingSettlement'>[] = [];
      let settlementData: { [shopkeeperId: string]: number } = {};

      const processData = () => {
          if (!shopkeepersData.length) return;
          
          const combinedData = shopkeepersData.map(shopkeeper => ({
              ...shopkeeper,
              pendingSettlement: settlementData[shopkeeper.uid] || 0
          }));

          setAllShopkeepers(combinedData);
          setFilteredShopkeepers(combinedData);
          setLoading(false);
      }

      unsubShopkeepers = onSnapshot(shopkeepersRef, (snapshot) => {
        shopkeepersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                displayName: data.displayName || 'Unnamed Shopkeeper',
                photoURL: data.photoURL,
                shopkeeperCode: data.shopkeeperCode,
                qrCodeUrl: data.qrCodeUrl,
                mobileNumber: data.mobileNumber
            }
        });
        processData();
      }, (error) => {
        console.error("Error fetching shopkeepers:", error);
        setLoading(false);
      });
      
      unsubTransactions = onSnapshot(qPayments, (snapshot) => {
          settlementData = {}; // Reset on new data
          snapshot.forEach(doc => {
              const tx = doc.data() as Transaction;
              const principalAmount = tx.amount / (1 + COMMISSION_RATE);
              if (settlementData[tx.shopkeeperId]) {
                  settlementData[tx.shopkeeperId] += principalAmount;
              } else {
                  settlementData[tx.shopkeeperId] = principalAmount;
              }
          });
          processData();
      }, (error) => {
          console.error("Error fetching transactions:", error);
          setLoading(false);
      });
    }

    fetchAndCalculate();

    return () => {
      if(unsubShopkeepers) unsubShopkeepers();
      if(unsubTransactions) unsubTransactions();
    };
  }, [firestore]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredShopkeepers(allShopkeepers);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = allShopkeepers.filter(shopkeeper =>
        shopkeeper.displayName.toLowerCase().includes(lowercasedFilter) ||
        shopkeeper.shopkeeperCode?.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredShopkeepers(filtered);
    }
  }, [searchTerm, allShopkeepers]);

  const navigateToShopkeeperDetails = (shopkeeperId: string) => {
    router.push(`/owner/shopkeeper/${shopkeeperId}`);
  };

  const openWhatsApp = (mobileNumber: string | undefined) => {
      if(mobileNumber) {
          const formattedNumber = mobileNumber.replace(/\D/g, '');
          const whatsappUrl = `https://wa.me/${formattedNumber.startsWith('91') ? formattedNumber : '91' + formattedNumber}`;
          window.open(whatsappUrl, '_blank');
      } else {
          toast({
              variant: 'destructive',
              title: "Mobile Number Not Found",
              description: "This shopkeeper has not provided a mobile number."
          });
      }
  }
  
  const handleUpdateAmount = async () => {
    if (!editingShopkeeper || !newAmount) return;
    const amount = parseFloat(newAmount);
    if(isNaN(amount) || amount < 0) {
        toast({ variant: 'destructive', title: "Invalid Amount" });
        return;
    }

    setIsUpdating(true);
    try {
        const shopkeeperRef = doc(firestore, 'shopkeepers', editingShopkeeper.uid);
        await updateDoc(shopkeeperRef, {
            pendingSettlement: amount
        });
        toast({ title: "Success", description: "This is a manual override. The live value will update on the next transaction." });
        setEditingShopkeeper(null);
        setNewAmount('');
    } catch (error) {
        console.error("Error updating settlement:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not update amount." });
    } finally {
        setIsUpdating(false);
    }
  }

  return (
    <>
        {viewingQr && (
            <div className="modal-overlay" onClick={() => setViewingQr(null)}>
                 <div className="login-card modal-content" style={{maxWidth: '350px', padding: '20px'}} onClick={(e) => e.stopPropagation()}>
                     <div className="modal-header" style={{marginBottom: '15px'}}>
                        <h2>Shopkeeper QR</h2>
                        <button className="close-button" onClick={() => setViewingQr(null)}>&times;</button>
                     </div>
                     <Image src={viewingQr} alt="Shopkeeper QR Code" width={300} height={300} style={{ margin: 'auto', borderRadius: '15px' }} />
                 </div>
            </div>
        )}
         {editingShopkeeper && (
            <div className="modal-overlay" onClick={() => setEditingShopkeeper(null)}>
                 <div className="login-card modal-content" style={{maxWidth: '420px'}} onClick={(e) => e.stopPropagation()}>
                     <div className="modal-header">
                        <h2>Override Settlement</h2>
                        <button className="close-button" onClick={() => setEditingShopkeeper(null)}>&times;</button>
                     </div>
                     <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '20px'}}>Manually set pending settlement for <strong>{editingShopkeeper.displayName}</strong>. Note: This is an override and will be recalculated on the next payment.</p>
                      <div className="form-group">
                        <div className="neu-input">
                            <input type="number" id="settlement-amount" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder=" " required />
                            <label htmlFor="settlement-amount">New Amount (₹)</label>
                            <div className="input-icon"><IndianRupee /></div>
                        </div>
                    </div>
                     <button onClick={handleUpdateAmount} className={`neu-button ${isUpdating ? 'loading' : ''}`} disabled={isUpdating} style={{margin: 0, background: '#00c896', color: 'white'}}>
                        <span className="btn-text">Save New Amount</span>
                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                     </button>
                 </div>
            </div>
        )}

        <main className="dashboard-main-content" style={{ padding: '20px' }}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
            <div className="login-header" style={{ marginBottom: '40px' }}>
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
                    Platform Ecosystem
                </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '30px', maxWidth: '800px', margin: 'auto' }}>
                <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
                    <div className="neu-input">
                    <input
                        type="text"
                        id="search"
                        placeholder=" "
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <label htmlFor="search">Search by Name or Code</label>
                    <div className="input-icon"><Search /></div>
                    </div>
                </div>
                <div className="token-balance" style={{ margin: 0, padding: '10px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{allShopkeepers.length}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6c7293', fontWeight: 500, marginTop: '2px' }}>Shopkeepers</span>
                </div>
            </div>

            {loading ? (
            <div className="loading-container" style={{ minHeight: '300px' }}>
                <div className="neu-spinner"></div>
                <p style={{ marginTop: '20px', color: '#9499b7' }}>Loading Shopkeepers...</p>
            </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {allShopkeepers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9499b7' }}>No shopkeepers found on the platform yet.</p>
                ) : filteredShopkeepers.length > 0 ? (
                filteredShopkeepers.map(shopkeeper => (
                    <div
                    key={shopkeeper.uid}
                    className="login-card"
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}
                    >
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigateToShopkeeperDetails(shopkeeper.uid)}>
                        <div className="neu-icon" style={{ width: '50px', height: '50px', margin: '0 15px 0 0' }}>
                            {shopkeeper.photoURL ? (
                            <Image src={shopkeeper.photoURL} alt={shopkeeper.displayName} width={50} height={50} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                            <User size={24} />
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: '#3d4468', fontWeight: 600, margin: 0 }}>{shopkeeper.displayName}</h3>
                             <p style={{ color: '#6c7293', fontSize: '14px', margin: '2px 0 0 0' }}>
                                Pending: <span style={{ fontWeight: 'bold', color: shopkeeper.pendingSettlement > 0 ? '#ff3b5c' : '#00c896' }}>₹{shopkeeper.pendingSettlement.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </p>
                        </div>
                        <ChevronRight size={24} style={{ color: '#9499b7' }} />
                    </div>
                    <div style={{borderTop: '1px solid #d1d9e6', paddingTop: '15px', display: 'flex', justifyContent: 'space-around', gap: '10px'}}>
                       <button onClick={() => shopkeeper.qrCodeUrl && setViewingQr(shopkeeper.qrCodeUrl)} disabled={!shopkeeper.qrCodeUrl} className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                            <QrCode size={16}/> View QR
                        </button>
                        <button onClick={() => { setEditingShopkeeper(shopkeeper); setNewAmount(shopkeeper.pendingSettlement.toFixed(2)); }} className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                            <Edit size={16}/> Override
                        </button>
                        <button onClick={() => openWhatsApp(shopkeeper.mobileNumber)} className="neu-button" style={{margin: 0, flex: 1, background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                            <WhatsAppIcon />
                        </button>
                    </div>
                    </div>
                ))
                ) : (
                    <p style={{ textAlign: 'center', color: '#9499b7' }}>No shopkeeper found matching your search.</p>
                )}
            </div>
            )}
        </div>
        </main>
    </>
  );
}
