'use client';

import { IndianRupee, User, Users } from 'lucide-react';

export default function OwnerWalletPage() {

    // Mock data - in a real app, this would come from Firestore
    const stats = {
        totalSettled: 75250,
        pendingSettlements: 12500,
        totalCustomersPaid: 88,
    };

    const pendingTransactions = [
        { id: 't1', customerName: 'Ramesh Kumar', shopkeeperName: 'Gupta General Store', amount: 450, date: '2 hours ago' },
        { id: 't2', customerName: 'Sunita Devi', shopkeeperName: 'Modern Kirana', amount: 1200, date: '5 hours ago' },
        { id: 't3', customerName: 'Amit Singh', shopkeeperName: 'Daily Needs', amount: 300, date: 'Yesterday' },
    ];


  return (
    <main className="dashboard-main-content" style={{ padding: '20px' }}>
        <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
            <div className="login-header" style={{marginBottom: '40px'}}>
                <div className="neu-icon" style={{width: '70px', height: '70px'}}>
                    <div className="icon-inner"><IndianRupee/></div>
                </div>
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
                    Platform Wallet & Settlements
                </h1>
                <p style={{ color: '#6c7293', marginTop: '1rem' }}>
                    Monitor incoming payments and manage shopkeeper settlements.
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div className="neu-input" style={{ padding: '20px' }}>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Pending Settlements</p>
                    <p style={{ color: '#ff3b5c', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>₹{stats.pendingSettlements.toLocaleString('en-IN')}</p>
                </div>
                <div className="neu-input" style={{ padding: '20px' }}>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Settled</p>
                    <p style={{ color: '#00c896', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>₹{stats.totalSettled.toLocaleString('en-IN')}</p>
                </div>
                <div className="neu-input" style={{ padding: '20px' }}>
                    <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', fontWeight: '500' }}>Paying Customers</p>
                    <p style={{ color: '#3d4468', margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>{stats.totalCustomersPaid}</p>
                </div>
            </div>

            {/* Pending Settlements List */}
            <div>
                 <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', marginBottom: '30px' }}>
                    Pending Settlements to Shopkeepers
                </h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pendingTransactions.length > 0 ? pendingTransactions.map(tx => (
                        <div key={tx.id} className="neu-input" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '5px 5px 15px #bec3cf, -5px -5px 15px #ffffff' }}>
                            <div>
                                <p style={{fontWeight: 600, color: '#3d4468'}}>From: {tx.customerName}</p>
                                <p style={{fontSize: '13px', color: '#9499b7', margin: '4px 0'}}>To: {tx.shopkeeperName}</p>
                                <p style={{fontSize: '12px', color: '#6c7293'}}>{tx.date}</p>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <p style={{fontWeight: 'bold', fontSize: '1.5rem', color: '#3d4468'}}>₹{tx.amount}</p>
                                <button className="neu-button" style={{padding: '8px 16px', fontSize: '13px', margin: 0, marginTop: '8px', background: '#00c896', color: 'white'}}>
                                    Mark as Settled
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p style={{textAlign: 'center', color: '#9499b7'}}>No pending settlements right now.</p>
                    )}
                 </div>
            </div>
        </div>
    </main>
  );
}
