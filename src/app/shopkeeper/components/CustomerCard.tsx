'use client';

import { User } from 'lucide-react';

interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface CustomerCardProps {
    customer: CustomerProfile;
    balance: number;
}

export default function CustomerCard({ customer, balance }: CustomerCardProps) {
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
                height: 'auto',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="neu-icon" style={{width: '50px', height: '50px', margin: 0, flexShrink: 0}}>
                    {customer.photoURL ? (
                        <img src={customer.photoURL} alt={customer.displayName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                    ) : (
                        <div className="icon-inner" style={{width: '24px', height: '24px'}}><User/></div>
                    )}
                </div>
                <div>
                    <h3 style={{color: '#3d4468', fontWeight: 600, fontSize: '1rem', margin: 0}}>{customer.displayName}</h3>
                    <p style={{color: '#9499b7', fontSize: '14px', margin: 0}}>{customer.email}</p>
                </div>
            </div>
            <div style={{textAlign: 'right'}}>
                 <span style={{fontSize: '1.25rem', fontWeight: 'bold', color: balanceColor}}>₹{Math.abs(balance)}</span>
                 <p style={{fontSize: '12px', color: balanceColor, margin: 0}}>{isCredit ? 'Udhaar' : 'Advance'}</p>
            </div>
        </div>
    );
}
