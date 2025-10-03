'use client';

import { User, IndianRupee, ArrowRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  defaultCreditLimit?: number;
}

interface ShopkeeperCardProps {
    shopkeeper: ShopkeeperProfile;
    balance: number;
}

export default function ShopkeeperCard({ shopkeeper, balance }: ShopkeeperCardProps) {
    const router = useRouter();
    
    // Use the shopkeeper-defined limit, or a default fallback.
    const creditLimit = shopkeeper.defaultCreditLimit ?? 1000; // Default to 1000 if not set
    const usedPercentage = creditLimit > 0 ? (Math.abs(balance) / creditLimit) * 100 : 0;
    
    const isCredit = balance > 0;
    const balanceColor = '#3d4468';
    const balanceText = isCredit ? 'Udhaar' : (balance < 0 ? 'Advance' : 'Settled');
    
    const getBarColor = () => {
        if (usedPercentage > 75) return '#ff3b5c'; // Red for high usage
        if (usedPercentage > 50) return '#007BFF'; // Blue for moderate usage
        return '#00c896'; // Green for low usage
    };
    const barColor = getBarColor();


    return (
        <div 
            className="login-card"
            style={{ 
                margin: 0,
                padding: '25px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}
            onClick={() => router.push(`/customer/payment/${shopkeeper.uid}`)}
        >
            {/* Top section: Profile and Balance */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden' }}>
                    <div className="neu-icon" style={{width: '50px', height: '50px', margin: 0, flexShrink: 0}}>
                        {shopkeeper.photoURL ? (
                            <img src={shopkeeper.photoURL} alt={shopkeeper.displayName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                        ) : (
                            <div className="icon-inner" style={{width: '24px', height: '24px'}}><User/></div>
                        )}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <h3 style={{color: '#3d4468', fontWeight: 600, fontSize: '1.1rem', margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{shopkeeper.displayName}</h3>
                         <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>{balanceText}</p>
                    </div>
                </div>
                <div style={{textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: balanceColor }}>₹{Math.abs(balance)}</span>
                    </div>
                    <ArrowRight size={20} style={{ color: '#9499b7', flexShrink: 0 }} />
                </div>
            </div>

            {/* Credit Limit Bar */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                    <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Credit Limit</span>
                    <span style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>₹{creditLimit.toLocaleString('en-IN')}</span>
                </div>
                <div style={{height: '8px', background: '#e0e5ec', borderRadius: '4px', boxShadow: 'inset 2px 2px 4px #bec3cf, inset -2px -2px 4px #ffffff', overflow: 'hidden'}}>
                    <div style={{width: `${usedPercentage > 100 ? 100 : usedPercentage}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.5s ease, background-color 0.5s ease'}}></div>
                </div>
            </div>
        </div>
    );
}