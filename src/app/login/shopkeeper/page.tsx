'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Key, Check, User, ArrowLeft, Phone } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { 
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueShopkeeperCode } from '@/lib/code-helpers';


export default function ShopkeeperAuthPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState<{ phone?: string; otp?: string; form?: string }>({});
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);
    
    // Initialize reCAPTCHA
    useEffect(() => {
        if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved
                }
            });
        }
    }, [auth]);


    const handleFormTransition = () => {
        localStorage.setItem('activeRole', 'shopkeeper');
        const formElements = document.querySelectorAll('.login-form');
        formElements.forEach(el => el.classList.add('form-hiding'));
        
        setTimeout(() => {
            setShowSuccess(true);
        }, 300);
        
        setTimeout(() => {
             router.push('/shopkeeper/dashboard');
        }, 2800);
    }

    const handleAuthSuccess = async (user: any, isNewUser: boolean) => {
        if (isNewUser) {
             const shopkeeperCode = await generateUniqueShopkeeperCode(firestore);
             await setDoc(doc(firestore, "shopkeepers", user.uid), {
                email: user.email || '',
                phoneNumber: user.phoneNumber,
                displayName: `Shopkeeper ${shopkeeperCode}`,
                photoURL: user.photoURL || '',
                createdAt: serverTimestamp(),
                role: 'shopkeeper',
                shopkeeperCode: shopkeeperCode,
            });
        }
        handleFormTransition();
    };

    const validatePhone = () => {
        const newErrors: { phone?: string } = {};
        if (!phone) {
            newErrors.phone = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(phone)) {
             newErrors.phone = 'Please enter a valid 10-digit mobile number.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePhone()) return;

        setLoading(true);
        setErrors({});

        if (!recaptchaVerifierRef.current) {
            setErrors({ form: 'reCAPTCHA not initialized. Please refresh.' });
            setLoading(false);
            return;
        }

        try {
            auth.settings.appVerificationDisabledForTesting = true;
            const fullPhoneNumber = `+91${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current);
            setConfirmationResult(confirmation);
        } catch (error: any) {
            console.error("OTP send error:", error);
            let errorMessage = "Failed to send OTP. Please check the number and try again.";
            if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many requests. Please try again later.";
            } else if (error.code === 'auth/invalid-phone-number') {
                errorMessage = "The phone number is not valid.";
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = "Network error. Please check your connection or emulator setup.";
            }
            setErrors({ form: errorMessage });
        } finally {
            setLoading(false);
        }
    };
    
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (!otp || otp.length !== 6) {
            setErrors({ otp: 'Please enter the 6-digit OTP.' });
            return;
        }

        if (!confirmationResult) {
            setErrors({ form: "Something went wrong. Please try sending OTP again." });
            return;
        }

        setLoading(true);
        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            const userDocRef = doc(firestore, 'shopkeepers', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            await handleAuthSuccess(user, !userDoc.exists());
        } catch (error: any) {
             let errorMessage = "Invalid OTP or request expired. Please try again.";
             if (error.code === 'auth/invalid-verification-code') {
                errorMessage = "Invalid OTP. Please check the code and try again.";
             } else if (error.code === 'auth/code-expired') {
                errorMessage = "The OTP has expired. Please request a new one."
             }
             setErrors({ form: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container-wrapper">
             <div id="recaptcha-container"></div>
            <div className="login-container">
                <div className="login-card" ref={cardRef}>
                    {!showSuccess ? (
                        <>
                            <div className="login-header">
                                <div className="neu-icon">
                                    <div className="icon-inner"><Store /></div>
                                </div>
                                <h2>Shopkeeper Portal</h2>
                                <p>{confirmationResult ? 'Enter OTP to continue' : 'Sign in with your mobile number'}</p>
                            </div>
                            
                            {confirmationResult ? (
                                <form className="login-form" noValidate onSubmit={handleVerifyOtp}>
                                     {errors.form && <div className="error-message show" style={{textAlign: 'center', marginBottom: '1rem', marginLeft: 0}}>{errors.form}</div>}
                                     <div className={`form-group ${errors.otp ? 'error' : ''}`}>
                                        <div className="neu-input">
                                            <input type="tel" id="otp" name="otp" required autoComplete="one-time-code" placeholder=" " value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
                                            <label htmlFor="otp">6-Digit OTP</label>
                                            <div className="input-icon"><Key /></div>
                                        </div>
                                        {errors.otp && <span className="error-message show">{errors.otp}</span>}
                                    </div>
                                    <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                        <span className="btn-text">Verify & Continue</span>
                                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                                    </button>
                                     <button type="button" className="neu-button" style={{margin: 0, background: 'transparent', boxShadow: 'none'}} onClick={() => { setConfirmationResult(null); setOtp(''); setErrors({}); }}>
                                        <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ArrowLeft size={16}/> Back</span>
                                    </button>
                                </form>
                            ) : (
                                <form className="login-form" noValidate onSubmit={handleSendOtp}>
                                    {errors.form && <div className="error-message show" style={{textAlign: 'center', marginBottom: '1rem', marginLeft: 0}}>{errors.form}</div>}
                                    <div className={`form-group ${errors.phone ? 'error' : ''}`}>
                                        <div className="neu-input">
                                             <span style={{position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#6c7293', fontWeight: 500}}>+91</span>
                                            <input type="tel" id="phone" name="phone" required autoComplete="tel" placeholder=" " value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} style={{paddingLeft: '65px'}} />
                                            <label htmlFor="phone" style={{left: '65px'}}>Mobile Number</label>
                                        </div>
                                        {errors.phone && <span className="error-message show">{errors.phone}</span>}
                                    </div>
                                    <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                        <span className="btn-text">Send OTP</span>
                                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                                    </button>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="success-message show">
                            <div className="neu-icon"><Check size={32} strokeWidth={3} /></div>
                            <h3>Success!</h3>
                            <p>Redirecting to your shop dashboard...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
