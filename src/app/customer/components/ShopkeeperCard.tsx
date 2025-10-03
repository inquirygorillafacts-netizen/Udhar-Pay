'use client';

import { User, IndianRupee, ArrowRight, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    const router = useRouter();
    const isCredit = balance > 0;
    const balanceColor = isCredit ? 'text-[#ff3b5c]' : 'text-[#00c896]';
    const balanceBgColor = isCredit ? 'bg-[#ff3b5c]' : 'bg-[#00c896]';
    const balanceText = isCredit ? 'Udhaar' : (balance < 0 ? 'Advance' : 'Settled');

    const handlePayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/customer/payment/${shopkeeper.uid}`);
    };

    const handleRequestClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/customer/request-credit/${shopkeeper.uid}`);
    };

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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
                    <span className={`text-xl font-bold ${balanceColor}`}>₹{Math.abs(balance)}</span>
                    <p className={`text-xs font-semibold ${balanceColor} mt-[-2px]`}>{balanceText}</p>
                </div>
            </div>

            {/* Visual Balance Bar */}
            <div style={{ height: '6px', background: '#d1d9e6', borderRadius: '3px', width: '100%', marginBottom: '25px' }}>
                <div 
                    className={balanceBgColor}
                    style={{ 
                        height: '100%', 
                        width: isCredit ? '100%' : '0%', // Bar is full for credit, empty for advance/settled
                        borderRadius: '3px',
                        transition: 'width 0.5s ease',
                    }}
                ></div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px' }}>
                {isCredit && (
                    <button onClick={handlePayClick} className="neu-button" style={{margin: 0, flex: 1, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                        <IndianRupee size={16}/> Pay
                    </button>
                )}
                 <button onClick={handleRequestClick} className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                    <Send size={16}/> Request
                 </button>
            </div>
        </div>
    );
}
