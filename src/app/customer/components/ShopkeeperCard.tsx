'use client';

import { User, IndianRupee, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string; // Kept in interface for prop compatibility, but not displayed
  photoURL?: string | null;
}

interface ShopkeeperCardProps {
    shopkeeper: ShopkeeperProfile;
    balance: number;
}

export default function ShopkeeperCard({ shopkeeper, balance }: ShopkeeperCardProps) {
    const router = useRouter();
    const isCredit = balance > 0;
    
    // Using a neutral, consistent color for the balance to avoid anxiety
    const balanceColor = '#3d4468';
    const balanceBgColor = isCredit ? 'bg-[#ff3b5c]' : 'bg-[#00c896]'; // Bar can still have color for quick visual cue
    const balanceText = isCredit ? 'Udhaar' : (balance < 0 ? 'Advance' : 'Settled');

    return (
        <div 
            className="login-card"
            style={{ 
                margin: 0,
                padding: '25px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
        </div>
    );
}
