
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, User, Users, BookUser, UserCheck, IndianRupee, KeyRound, QrCode, Lock, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface ShopkeeperProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    shopkeeperCode?: string;
    pinEnabled?: boolean;
    pin?: string;
    qrUpdatePin?: string;
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
    const shopkeeperId = params.shopkeeperId as string;

    const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
    const [customerStatus, setCustomerStatus] = useState<CustomerCheck | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

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

                // Check if shopkeeper is also a customer
                const customerRef = doc(firestore, 'customers', shopkeeperId);
                const customerSnap = await getDoc(customerRef);
                setCustomerStatus({ isCustomer: customerSnap.exists() });

                // Calculate analytics
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
    
    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    if (!shopkeeper) {
        return <div className="loading-container">Could not load shopkeeper data.</div>;
    }

    return (
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
    );
}

