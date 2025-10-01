'use client';

export default function CustomerLedgerPage() {
  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{maxWidth: '600px', margin: 'auto', textAlign: 'center'}}>
             <div className="login-header">
                <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
                    Transaction Ledger
                </h1>
                <p style={{ color: '#6c7293', marginTop: '1rem' }}>
                    A detailed history of all your credit and payment transactions will be displayed here.
                </p>
            </div>
        </div>
    </main>
  );
}
