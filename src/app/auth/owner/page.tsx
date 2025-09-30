'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './owner.css';
import { Mail, Lock, Eye, EyeOff, Check, Shield } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
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
    const [showSuccess, setShowSuccess] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleFormTransition = () => {
        const formElements = document.querySelectorAll('.login-form');
        formElements.forEach(el => el.classList.add('form-hiding'));
        
        setTimeout(() => {
            setShowSuccess(true);
        }, 300);
        
        setTimeout(() => {
             console.log('Redirecting to owner dashboard...');
             // This is where you would redirect to the owner's dashboard
             // router.push('/owner/dashboard');
        }, 2800);
    }
    
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
    
            // Role check in Firestore
            try {
                const userDocRef = doc(firestore, 'owners', user.uid);
                const userDoc = await getDoc(userDocRef);
        
                if (userDoc.exists() && userDoc.data().role === 'owner') {
                    // User is authenticated and is an owner
                    handleFormTransition();
                } else {
                    // User is authenticated but not an owner, or doc doesn't exist
                    await auth.signOut(); // Sign out the user
                    setErrors({ form: 'Access denied. You do not have owner privileges.' });
                }
            } catch (firestoreError) {
                console.error("Firestore role check failed:", firestoreError);
                await auth.signOut();
                setErrors({ form: 'Could not verify user role. Please try again.' });
            }
        } catch (authError: any) {
             let errorMessage = "Authentication failed. Please try again.";
             if (authError.code) {
                 switch (authError.code) {
                     case 'auth/user-not-found':
                     case 'auth/wrong-password':
                     case 'auth/invalid-credential':
                         errorMessage = 'Invalid email or password. Access denied.';
                         break;
                     default:
                         // Keep the generic message for other auth errors
                         errorMessage = 'Authentication failed. Please try again.';
                 }
             }
             setErrors({ form: errorMessage });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const card = document.querySelector('.login-card') as HTMLDivElement;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (window.innerWidth < 768) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const angleX = (x - centerX) / centerX;
            const angleY = (y - centerY) / centerY;
            
            const shadowX = angleX * 20;
            const shadowY = angleY * 20;
            
            card.style.boxShadow = `
                ${shadowX}px ${shadowY}px 60px #bec3cf,
                ${-shadowX}px ${-shadowY}px 60px #ffffff
            `;
        };

        const handleMouseLeave = () => {
            card.style.boxShadow = `
                20px 20px 60px #bec3cf,
                -20px -20px 60px #ffffff
            `;
        };

        document.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            if(card) card.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div className="login-container-wrapper">
            <div className="login-container">
                <div className="login-card" ref={cardRef}>
                    {!showSuccess ? (
                        <>
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
                        </>
                    ) : (
                        <div className="success-message show">
                            <div className="neu-icon">
                               <Check size={32} strokeWidth={3} />
                            </div>
                            <h3>Access Granted!</h3>
                            <p>Redirecting to the owner dashboard...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
