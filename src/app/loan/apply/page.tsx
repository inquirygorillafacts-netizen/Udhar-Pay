'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, User, IndianRupee, Briefcase, GraduationCap, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoanApplicationPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const [userProfile, setUserProfile] = useState<{ name: string; email: string; role: 'customer' | 'shopkeeper' } | null>(null);
    const [loading, setLoading] = useState(true);

    const [loanAmount, setLoanAmount] = useState('');
    const [loanPurpose, setLoanPurpose] = useState('');
    const [tenure, setTenure] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) {
            router.push('/auth');
            return;
        }

        const fetchUserProfile = async () => {
            const user = auth.currentUser;
            const activeRole = localStorage.getItem('activeRole') as 'customer' | 'shopkeeper';

            if (!activeRole) {
                toast({ variant: 'destructive', title: 'Error', description: 'Active role not found. Please log in again.' });
                router.push('/auth');
                return;
            }

            const collectionName = `${activeRole}s`;
            const docRef = doc(firestore, collectionName, user!.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                    name: data.displayName,
                    email: data.email,
                    role: activeRole
                });
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: 'User profile not found.' });
                 router.back();
            }
            setLoading(false);
        };

        fetchUserProfile();

    }, [auth.currentUser, firestore, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!loanAmount || !loanPurpose || !tenure) {
            setError('Please fill out all fields.');
            return;
        }
        
        const amount = parseFloat(loanAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid loan amount.');
            return;
        }
        
        const tenureMonths = parseInt(tenure);
        if (isNaN(tenureMonths) || tenureMonths <= 0) {
            setError('Please enter a valid tenure in months.');
            return;
        }

        if (!auth.currentUser || !userProfile) {
            setError('Authentication error. Please try again.');
            return;
        }

        setIsSubmitting(true);

        try {
            await addDoc(collection(firestore, 'loanApplications'), {
                userId: auth.currentUser.uid,
                userName: userProfile.name,
                userEmail: userProfile.email,
                userRole: userProfile.role,
                loanAmount: amount,
                loanPurpose,
                tenure: tenureMonths,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            setSuccess(true);
        } catch (err) {
            console.error('Loan application submission error:', err);
            setError('Failed to submit application. Please try again later.');
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    if (success) {
      return (
          <div className="login-container">
              <div className="login-card" style={{maxWidth: '450px', textAlign: 'center'}}>
                <div className="neu-icon" style={{background: '#00c896', color: 'white', width: '100px', height: '100px', marginBottom: '30px'}}>
                  <Send size={40}/>
                </div>
                <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '15px'}}>Application Submitted!</h2>
                <p style={{color: '#6c7293', marginBottom: '30px', fontSize: '1rem'}}>
                    Your loan application has been received. Our team will review it and contact you shortly.
                </p>
                <button className="neu-button" onClick={() => router.back()}>
                    Back to Profile
                </button>
              </div>
          </div>
      )
  }

    return (
        <div>
            <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
                <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{textAlign: 'center', flexGrow: 1}}>
                    <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Apply for a Loan</h1>
                </div>
                <div style={{width: '45px'}}></div>
            </header>

             <main className="dashboard-main-content" style={{padding: '20px'}}>
                <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <div className="neu-input">
                                <input type="number" id="loanAmount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} required placeholder=" " />
                                <label htmlFor="loanAmount">Loan Amount (₹)</label>
                                <div className="input-icon"><IndianRupee /></div>
                            </div>
                        </div>

                         <div className="form-group">
                             <div className="neu-input" style={{padding: '10px 20px', display: 'flex', alignItems: 'center'}}>
                                <select 
                                    id="loanPurpose" 
                                    value={loanPurpose} 
                                    onChange={(e) => setLoanPurpose(e.target.value)} 
                                    required
                                    style={{width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#3d4468', fontSize: '16px', fontWeight: 500, cursor: 'pointer'}}
                                >
                                    <option value="" disabled>Select Loan Purpose</option>
                                    <option value="business">Business Expansion</option>
                                    <option value="personal">Personal Emergency</option>
                                    <option value="education">Education</option>
                                    <option value="other">Other</option>
                                </select>
                             </div>
                        </div>

                        <div className="form-group">
                            <div className="neu-input">
                                <input type="number" id="tenure" value={tenure} onChange={(e) => setTenure(e.target.value)} required placeholder=" " />
                                <label htmlFor="tenure">Loan Tenure (in months)</label>
                                <div className="input-icon"><Briefcase /></div>
                            </div>
                        </div>
                        
                        {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}

                        <button type="submit" className={`neu-button ${isSubmitting ? 'loading' : ''}`} disabled={isSubmitting} style={{marginTop: '20px'}}>
                            <span className="btn-text">Submit Application</span>
                            <div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                    </form>
                </div>
             </main>
        </div>
    );
}
