'use client';

import { User } from 'lucide-react';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface ShopkeeperCardProps {
    shopkeeper: ShopkeeperProfile;
    balance: number;
}

export default function ShopkeeperCard({ shopkeeper, balance }: ShopkeeperCardProps) {
    const isCredit = balance > 0;
    const balanceColor = isCredit ? '#ff3b5c' : '#00c896';

    return (
        <div 
            className="neu-button" 
            style={{ 
                margin: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '20px',
                height: 'auto'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="neu-icon" style={{width: '50px', height: '50px', margin: 0, flexShrink: 0}}>
                    {shopkeeper.photoURL ? (
                        <img src={shopkeeper.photoURL} alt={shopkeeper.displayName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                    ) : (
                        <div className="icon-inner" style={{width: '24px', height: '24px'}}><User/></div>
                    )}
                </div>
                <div>
                    <h3 style={{color: '#3d4468', fontWeight: 600, fontSize: '1rem', margin: 0}}>{shopkeeper.displayName}</h3>
                    <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>{shopkeeper.email}</p>
                </div>
            </div>
            <div style={{textAlign: 'right'}}>
                 <span style={{fontSize: '1.25rem', fontWeight: 'bold', color: balanceColor}}>₹{Math.abs(balance)}</span>
                 <p style={{fontSize: '12px', color: balanceColor, margin: 0}}>{isCredit ? 'Udhaar' : 'Advance'}</p>
            </div>
        </div>
    );
}
