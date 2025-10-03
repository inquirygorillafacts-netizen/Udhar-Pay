'use client';

import { User, ShieldOff } from 'lucide-react';

interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  balances?: { [key: string]: number };
}

interface CustomerCardProps {
    customer: CustomerProfile;
    shopkeeperId: string;
    creditLimit: number;
    isCreditEnabled: boolean;
}


const CustomerCard = ({ customer, shopkeeperId, creditLimit, isCreditEnabled }: CustomerCardProps) => {
  // Get the balance specific to this shopkeeper
  const balance = customer.balances?.[shopkeeperId] || 0;
  
  // Calculate used percentage only if there is a positive balance (actual credit)
  const usedPercentage = balance > 0 ? (balance / creditLimit) * 100 : 0;

  const getBarColor = () => {
      if (!isCreditEnabled) return '#a0aec0'; // Muted grey if credit is off
      if (usedPercentage > 75) return '#ff3b5c'; // Red for high usage
      if (usedPercentage > 50) return '#007BFF'; // Blue for moderate usage
      return '#00c896'; // Green for low usage
  };
  const barColor = getBarColor();

  return (
    <div className="neu-input" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', boxShadow: '5px 5px 15px #bec3cf, -5px -5px 15px #ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div className="neu-icon" style={{ width: '50px', height: '50px', margin: 0, flexShrink: 0 }}>
          {customer.photoURL ? (
            <img src={customer.photoURL} alt={customer.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="icon-inner" style={{width: '28px', height: '28px'}}><User/></div>
          )}
        </div>
        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
          <h3 style={{ color: '#3d4468', fontSize: '1.1rem', fontWeight: '600', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {customer.displayName}
          </h3>
          <p style={{ color: '#9499b7', fontSize: '13px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {customer.email}
          </p>
        </div>
        <div style={{textAlign: 'right'}}>
          <p style={{color: '#9499b7', fontSize: '12px', margin: 0, fontWeight: 500}}>Used</p>
          <p style={{ color: balance > 0 ? '#3d4468' : '#00c896', fontSize: '1.2rem', fontWeight: '700', margin: 0}}>₹{balance}</p>
        </div>
      </div>
      
      {/* Credit Limit Bar */}
      <div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
              <span style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>
                {isCreditEnabled ? 'Credit Limit' : <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><ShieldOff size={12}/> Credit Disabled</span>}
              </span>
              {isCreditEnabled && <span style={{fontSize: '12px', color: '#3d4468', fontWeight: 600}}>₹{creditLimit}</span>}
          </div>
          <div style={{height: '8px', background: '#e0e5ec', borderRadius: '4px', boxShadow: 'inset 2px 2px 4px #bec3cf, inset -2px -2px 4px #ffffff', overflow: 'hidden'}}>
            <div style={{width: `${usedPercentage > 100 ? 100 : usedPercentage}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.5s ease, background-color 0.5s ease'}}></div>
          </div>
      </div>

    </div>
  );
};

export default CustomerCard;
