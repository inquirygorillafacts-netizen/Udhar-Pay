'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './owner.css';
import { Mail, Lock, Eye, EyeOff, Check, Shield } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';


export default function OwnerAuthPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
    const [loading, setLoading] = useState(false);
    
    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) newErrors.email = 'Email is required';
        else if (!emailRegex.test(email)) newErrors.email = 'Please enter a valid email';

        if (!password) newErrors.password = 'Password is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
    
        setLoading(true);
        setErrors({});
    
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
    
            const userDocRef = doc(firestore, 'owner_o2Vco2LqnvWsZijYtb4EDMNdOOC2', user.uid);
            const userDoc = await getDoc(userDocRef);
    
            if (userDoc.exists() && userDoc.data().role === '**##owner_XwJfOW27AvfN5ELUzbUPpXPcbG73_locked##**') {
                localStorage.setItem('activeRole', 'owner');
                const userData = userDoc.data();
                
                // CRITICAL 2FA CHECK
                if (userData.pinEnabled && userData.pin) {
                    // PIN is enabled, redirect to PIN lock screen for 2FA.
                    // Pass the correct PIN and target path in session storage for security.
                    sessionStorage.setItem('pinCheckData', JSON.stringify({
                        correctPin: userData.pin,
                        targetPath: '/owner/dashboard'
                    }));
                    router.push('/owner/login/pin');
                } else {
                    // No PIN set up, proceed directly to dashboard (but encourage PIN setup).
                    router.push('/owner/dashboard');
                }
            } else {
                await auth.signOut(); 
                setErrors({ form: 'Access denied. You do not have owner privileges.' });
            }
        } catch (authError: any) {
             let errorMessage;
             if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
                 errorMessage = 'Invalid email or password. Access denied.';
             } else {
                 errorMessage = 'Authentication failed. Please try again.';
                 console.error("Authentication error:", authError);
             }
             setErrors({ form: errorMessage });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="login-container-wrapper">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="neu-icon">
                            <div className="icon-inner">
                               <Shield />
                            </div>
                        </div>
                        <h2>Owner Login</h2>
                        <p>Secure access for administrators</p>
                    </div>
                    
                    <form className="login-form" noValidate onSubmit={handleSubmit}>
                        {errors.form && <div className="error-message show" style={{textAlign: 'center', marginBottom: '1rem', marginLeft: 0}}>{errors.form}</div>}
                        <div className={`form-group ${errors.email ? 'error' : ''}`}>
                            <div className="neu-input">
                                <input type="email" id="email" name="email" required autoComplete="email" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} onBlur={validate} />
                                <label htmlFor="email">Owner Email</label>
                                <div className="input-icon"><Mail /></div>
                            </div>
                            {errors.email && <span className="error-message show">{errors.email}</span>}
                        </div>

                        <div className={`form-group ${errors.password ? 'error' : ''}`}>
                            <div className="neu-input password-group">
                                <input type={showPassword ? 'text' : 'password'} id="password" name="password" required autoComplete="current-password" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} onBlur={validate}/>
                                <label htmlFor="password">Password</label>
                                <div className="input-icon"><Lock /></div>
                                <button type="button" className="neu-toggle" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>
                                   {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                            {errors.password && <span className="error-message show">{errors.password}</span>}
                        </div>

                        <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                            <span className="btn-text">Sign In</span>
                            <div className="btn-loader">
                                <div className="neu-spinner"></div>
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
