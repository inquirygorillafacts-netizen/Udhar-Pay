
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, User, Users, BookUser, UserCheck, IndianRupee, KeyRound, QrCode, Lock, ShieldCheck, Edit, Save, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

interface ShopkeeperProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    shopkeeperCode?: string;
    pinEnabled?: boolean;
    pin?: string;
    qrUpdatePin?: string;
    qrCodeUrl?: string;
    mobileNumber?: string;
    connections?: string[];
    balances?: { [key: string]: number };
    pendingSettlement?: number;
}

interface CustomerCheck {
    isCustomer: boolean;
}

interface Analytics {
    totalCustomers: number;
    customersOnCredit: number;
    customersWithZeroBalance: number;
    totalOutstanding: number;
}

export default function ShopkeeperJeevanKundliPage() {
    const router = useRouter();
    const params = useParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const shopkeeperId = params.shopkeeperId as string;

    const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
    const [customerStatus, setCustomerStatus] = useState<CustomerCheck | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal States for actions
    const [viewingQr, setViewingQr] = useState<string | null>(null);
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [newAmount, setNewAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!firestore || !shopkeeperId) {
            router.push('/owner/ecosystem');
            return;
        }

        const fetchShopkeeperData = async () => {
            setLoading(true);
            try {
                const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
                const shopkeeperSnap = await getDoc(shopkeeperRef);

                if (!shopkeeperSnap.exists()) {
                    throw new Error('Shopkeeper not found');
                }

                const data = shopkeeperSnap.data() as ShopkeeperProfile;
                data.uid = shopkeeperId;
                setShopkeeper(data);

                const customerRef = doc(firestore, 'customers', shopkeeperId);
                const customerSnap = await getDoc(customerRef);
                setCustomerStatus({ isCustomer: customerSnap.exists() });

                const customerIds = data.connections || [];
                const balances = data.balances || {};
                let customersOnCredit = 0;
                let totalOutstanding = 0;

                customerIds.forEach(id => {
                    const balance = balances[id] || 0;
                    if (balance > 0) {
                        customersOnCredit++;
                        totalOutstanding += balance;
                    }
                });

                setAnalytics({
                    totalCustomers: customerIds.length,
                    customersOnCredit: customersOnCredit,
                    customersWithZeroBalance: customerIds.length - customersOnCredit,
                    totalOutstanding: totalOutstanding,
                });

            } catch (error) {
                console.error("Error fetching shopkeeper details:", error);
                router.push('/owner/ecosystem');
            } finally {
                setLoading(false);
            }
        };

        fetchShopkeeperData();
    }, [firestore, shopkeeperId, router]);
    
    const openWhatsApp = () => {
      if(shopkeeper?.mobileNumber) {
          const formattedNumber = shopkeeper.mobileNumber.replace(/\D/g, '');
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
        if (!shopkeeper || !newAmount) return;
        const amount = parseFloat(newAmount);
        if(isNaN(amount) || amount < 0) {
            toast({ variant: 'destructive', title: "Invalid Amount" });
            return;
        }

        setIsUpdating(true);
        try {
            const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeper.uid);
            await updateDoc(shopkeeperRef, {
                pendingSettlement: amount
            });
            setShopkeeper(prev => prev ? { ...prev, pendingSettlement: amount } : null);
            toast({ title: "Success", description: "Pending settlement updated." });
            setIsEditingAmount(false);
            setNewAmount('');
        } catch (error) {
            console.error("Error updating settlement:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not update amount." });
        } finally {
            setIsUpdating(false);
        }
    }

    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    if (!shopkeeper) {
        return <div className="loading-container">Could not load shopkeeper data.</div>;
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
             {isEditingAmount && (
                <div className="modal-overlay" onClick={() => setIsEditingAmount(false)}>
                     <div className="login-card modal-content" style={{maxWidth: '420px'}} onClick={(e) => e.stopPropagation()}>
                         <div className="modal-header">
                            <h2>Update Settlement</h2>
                            <button className="close-button" onClick={() => setIsEditingAmount(false)}>&times;</button>
                         </div>
                         <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '20px'}}>Manually set pending settlement for <strong>{shopkeeper.displayName}</strong>.</p>
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
            
            <div>
                <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
                    <button onClick={() => router.back()} className="neu-button" style={{ width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center', flexGrow: 1 }}>
                        <h1 style={{ color: '#3d4468', fontSize: '1.2rem', fontWeight: '600' }}>Shopkeeper Profile</h1>
                    </div>
                    <div className="user-avatar neu-icon" style={{ width: '45px', height: '45px', margin: 0, flexShrink: 0 }}>
                        {shopkeeper.photoURL ? (
                            <Image src={shopkeeper.photoURL} alt={shopkeeper.displayName} width={45} height={45} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <User size={24} />
                        )}
                    </div>
                </header>
                
                <main className="dashboard-main-content" style={{ padding: '20px' }}>
                    <div style={{ maxWidth: '700px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* Basic Info */}
                        <div className="login-card">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div className="neu-icon" style={{width: '100px', height: '100px', margin: 'auto', marginBottom: '15px'}}>
                                   {shopkeeper.photoURL ? <Image src={shopkeeper.photoURL} alt={shopkeeper.displayName} width={100} height={100} style={{ borderRadius: '50%', objectFit: 'cover' }}/> : <User size={50}/>}
                                </div>
                                <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '5px'}}>{shopkeeper.displayName}</h2>
                                <p style={{ color: '#9499b7', margin: 0 }}>{shopkeeper.email}</p>
                                <p className="token-balance" style={{ margin: '15px auto 0 auto', width: 'fit-content', padding: '5px 15px', fontSize: '1rem' }}>
                                    <QrCode size={16}/> {shopkeeper.shopkeeperCode || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Financials */}
                         <div className="login-card">
                             <h3 className="setting-title" style={{textAlign: 'center', border: 'none', padding: 0, margin: '0 0 20px 0'}}>Financials</h3>
                             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                <div className="neu-input" style={{padding: '20px', textAlign: 'center'}}>
                                    <p style={{color: '#ff3b5c', fontSize: '14px', fontWeight: 500, margin: 0}}>Pending Settlement</p>
                                    <p style={{color: '#3d4468', fontSize: '1.75rem', fontWeight: 700}}>₹{shopkeeper.pendingSettlement?.toLocaleString('en-IN') || 0}</p>
                                </div>
                                <div className="neu-input" style={{padding: '20px', textAlign: 'center'}}>
                                    <p style={{color: '#007BFF', fontSize: '14px', fontWeight: 500, margin: 0}}>Outstanding Credit</p>
                                    <p style={{color: '#3d4468', fontSize: '1.75rem', fontWeight: 700}}>₹{analytics?.totalOutstanding.toLocaleString('en-IN') || 0}</p>
                                </div>
                             </div>
                             <div style={{borderTop: '1px solid #d1d9e6', marginTop: '20px', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', gap: '10px'}}>
                               <button onClick={() => shopkeeper.qrCodeUrl && setViewingQr(shopkeeper.qrCodeUrl)} disabled={!shopkeeper.qrCodeUrl} className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                    <QrCode size={16}/> View QR
                                </button>
                                <button onClick={() => { setIsEditingAmount(true); setNewAmount(shopkeeper.pendingSettlement?.toString() || '0'); }} className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                    <Edit size={16}/> Update
                                </button>
                                <button onClick={openWhatsApp} className="neu-button" style={{margin: 0, flex: 1, background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                    <WhatsAppIcon />
                                </button>
                            </div>
                         </div>

                        {/* Customer Analytics */}
                        {analytics && (
                             <div className="login-card">
                                <h3 className="setting-title" style={{textAlign: 'center', border: 'none', padding: 0, margin: '0 0 20px 0'}}>Customer Analytics</h3>
                                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                                    <div className="neu-input" style={{ padding: '20px', textAlign: 'center' }}>
                                        <Users size={24} style={{ margin: '0 auto 10px', color: '#6c7293' }}/>
                                        <p style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: 700}}>{analytics.totalCustomers}</p>
                                        <p style={{color: '#6c7293', fontSize: '12px', fontWeight: 500}}>Total Customers</p>
                                    </div>
                                    <div className="neu-input" style={{ padding: '20px', textAlign: 'center' }}>
                                        <BookUser size={24} style={{ margin: '0 auto 10px', color: '#6c7293' }}/>
                                        <p style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: 700}}>{analytics.customersOnCredit}</p>
                                        <p style={{color: '#6c7293', fontSize: '12px', fontWeight: 500}}>On Credit</p>
                                    </div>
                                    <div className="neu-input" style={{ padding: '20px', textAlign: 'center' }}>
                                        <UserCheck size={24} style={{ margin: '0 auto 10px', color: '#6c7293' }}/>
                                        <p style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: 700}}>{analytics.customersWithZeroBalance}</p>
                                        <p style={{color: '#6c7293', fontSize: '12px', fontWeight: 500}}>Settled</p>
                                    </div>
                                </div>
                             </div>
                        )}
                        
                        {/* Security & Roles */}
                         <div className="login-card">
                             <h3 className="setting-title" style={{textAlign: 'center', border: 'none', padding: 0, margin: '0 0 20px 0'}}>Security & Roles</h3>
                             <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                 <div className="neu-input" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><Lock size={20} /> App Lock PIN</div>
                                     <span style={{fontWeight: 'bold', color: shopkeeper.pinEnabled ? '#00c896' : '#ff3b5c' }}>{shopkeeper.pin || 'Not Set'}</span>
                                 </div>
                                 <div className="neu-input" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><KeyRound size={20} /> QR Update PIN</div>
                                     <span style={{fontWeight: 'bold', color: shopkeeper.qrUpdatePin ? '#00c896' : '#ff3b5c' }}>{shopkeeper.qrUpdatePin || 'Not Set'}</span>
                                 </div>
                                 <div className="neu-input" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><ShieldCheck size={20} /> Is Also Customer?</div>
                                     <span style={{fontWeight: 'bold', color: customerStatus?.isCustomer ? '#00c896' : '#6c7293'}}>{customerStatus?.isCustomer ? 'Yes' : 'No'}</span>
                                 </div>
                             </div>
                         </div>
                    </div>
                </main>
            </div>
        </>
    );
}
