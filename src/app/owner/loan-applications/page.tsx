'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { LandPlot, User, Store, IndianRupee, Calendar, Check, X, Phone, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoanApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'customer' | 'shopkeeper';
  loanAmount: number;
  loanPurpose: string;
  tenure: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: {
    toDate: () => Date;
  };
}

export default function LoanApplicationsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);

    const applicationsRef = collection(firestore, 'loanApplications');
    const q = query(applicationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanApplication));
      setApplications(appList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching loan applications:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load loan applications.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const appRef = doc(firestore, 'loanApplications', id);
      await updateDoc(appRef, { status: newStatus });
      toast({ title: 'Success', description: `Application has been ${newStatus}.` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };
  
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <main className="dashboard-main-content" style={{ padding: '20px' }}>
      <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
        <div className="login-header" style={{ marginBottom: '40px' }}>
          <div className="neu-icon"><div className="icon-inner"><LandPlot /></div></div>
          <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Loan Applications</h1>
          <p style={{ color: '#6c7293' }}>Review and manage all loan requests.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`neu-button ${filter === f ? 'active' : ''}`} style={{ margin: 0, padding: '10px 15px', textTransform: 'capitalize', fontSize: '14px', width: 'auto' }}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="neu-spinner"></div>
            <p style={{ marginTop: '20px', color: '#9499b7' }}>Loading Applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="login-card" style={{ padding: '40px 20px' }}>
            <p style={{ textAlign: 'center', color: '#9499b7', margin: 0 }}>No {filter !== 'all' ? filter : ''} applications found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {filteredApplications.map(app => (
              <div key={app.id} className="login-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ color: '#3d4468', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {app.userRole === 'customer' ? <User size={20}/> : <Store size={20}/>}
                      {app.userName}
                    </h3>
                    <p style={{ color: '#9499b7', fontSize: '13px', margin: '2px 0 10px 0' }}>{app.userEmail}</p>
                  </div>
                  <div className={`token-balance ${
                      app.status === 'approved' ? 'bg-green-100' : app.status === 'rejected' ? 'bg-red-100' : ''
                    }`} style={{ 
                      padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', height: 'auto',
                      color: app.status === 'approved' ? '#00c896' : app.status === 'rejected' ? '#ff3b5c' : '#6c7293'
                   }}>
                    {app.status}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #d1d9e6', borderBottom: '1px solid #d1d9e6', padding: '15px 0', margin: '15px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div style={{textAlign: 'center'}}>
                    <p style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Loan Amount</p>
                    <p style={{fontSize: '1.2rem', fontWeight: 700, color: '#3d4468'}}>₹{app.loanAmount.toLocaleString('en-IN')}</p>
                  </div>
                   <div style={{textAlign: 'center'}}>
                    <p style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Purpose</p>
                    <p style={{fontSize: '1.2rem', fontWeight: 700, color: '#3d4468', textTransform: 'capitalize'}}>{app.loanPurpose}</p>
                  </div>
                   <div style={{textAlign: 'center'}}>
                    <p style={{fontSize: '12px', color: '#6c7293', fontWeight: 500}}>Tenure</p>
                    <p style={{fontSize: '1.2rem', fontWeight: 700, color: '#3d4468'}}>{app.tenure} months</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#9499b7' }}>Applied on: {app.createdAt.toDate().toLocaleDateString('en-IN')}</p>
                  {app.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleStatusUpdate(app.id, 'rejected')} className="neu-button" style={{ margin: 0, padding: '10px', width: 'auto', height: 'auto', background: '#ff3b5c', color: 'white' }}><X size={18} /></button>
                      <button onClick={() => handleStatusUpdate(app.id, 'approved')} className="neu-button" style={{ margin: 0, padding: '10px', width: 'auto', height: 'auto', background: '#00c896', color: 'white' }}><Check size={18} /></button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
