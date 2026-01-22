'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Phone, Shield, MessageCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueShopkeeperCode } from '@/lib/code-helpers';
import Link from 'next/link';

// Extend Window interface to allow storing variables globally
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function ShopkeeperAuthPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [showInvalidOtpModal, setShowInvalidOtpModal] = useState(false);
    const [showGenericErrorModal, setShowGenericErrorModal] = useState(false);
    
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const setupRecaptcha = () => {
        if (!auth) return;

        // Ensure any old verifier is cleared
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
        }
        
        const container = document.getElementById('recaptcha-container');
        if (container) {
             // Ensure the container is empty before creating a new verifier
            container.innerHTML = '';
            try {
                const verifier = new RecaptchaVerifier(auth, container, {
                    'size': 'invisible', // Invisible reCAPTCHA
                    'callback': () => {},
                });
                window.recaptchaVerifier = verifier;
            } catch (e) {
                console.error("Recaptcha verifier error", e);
            }
        } else {
            console.error("reCAPTCHA container not found.");
        }
    };
    
    // Setup recaptcha only when we are on the phone number step
    useEffect(() => {
        if (!isOtpSent) {
            const timerId = setTimeout(setupRecaptcha, 100);
            return () => clearTimeout(timerId);
        }
    }, [isOtpSent, auth]);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isOtpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
            if(interval) clearInterval(interval);
        }
        return () => {
            if(interval) clearInterval(interval);
        };
    }, [isOtpSent, timer]);

    const resetTimer = () => {
        setTimer(60);
        setCanResend(false);
    };

    const handleSendOtp = async (isResend = false) => {
        setError('');
        setLoading(true);

        if (!window.recaptchaVerifier) {
            setupRecaptcha();
        }

        setTimeout(async () => {
            if (!window.recaptchaVerifier) {
                setError("reCAPTCHA not ready. Please try again.");
                setLoading(false);
                return;
            }

            try {
                const fullPhoneNumber = `+91${phoneNumber}`;
                const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
                window.confirmationResult = confirmationResult;
                setIsOtpSent(true);
                setSuccessMessage("OTP sent successfully!");
                resetTimer();
            } catch (err: any) {
                console.error("Error sending OTP:", err);
                 if (err.code === 'auth/user-disabled') {
                    setShowBlockedModal(true);
                } else if (err.message.includes("reCAPTCHA client element has been removed")) {
                     setError("reCAPTCHA expired. Please try sending the OTP again.");
                     setupRecaptcha(); // Attempt to fix it for the next try
                } else {
                    setError(err.message || "Failed to send OTP. Please check the number and try again.");
                }
            } finally {
                setLoading(false);
            }
        }, 500);
    };
    
    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
    
            const userDocRef = doc(firestore, 'shopkeepers', user.uid);
            const userDoc = await getDoc(userDocRef);
    
            localStorage.setItem('activeRole', 'shopkeeper');
    
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    mobileNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    shopkeeperCode: await generateUniqueShopkeeperCode(firestore),
                    connections: [],
                    role: 'shopkeeper'
                });
                router.push('/auth/onboarding?role=shopkeeper');
            } else {
                setSuccessMessage("Login Successful! Redirecting...");
                sessionStorage.setItem('post_login_nav', 'true');
                setTimeout(() => router.push('/shopkeeper/dashboard'), 1500);
            }
        } catch (err: any) {
            console.error("Google Sign-in Error:", err);
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        handleSendOtp(true);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!window.confirmationResult) {
            setError("Session expired. Please request a new OTP.");
            setLoading(false);
            return;
        }

        try {
            const result = await window.confirmationResult.confirm(otp);
            const user = result.user;

            const userDocRef = doc(firestore, 'shopkeepers', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            localStorage.setItem('activeRole', 'shopkeeper');

            if (!userDoc.exists()) {
                 await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName || null,
                    email: user.email,
                    mobileNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    shopkeeperCode: await generateUniqueShopkeeperCode(firestore),
                    connections: [],
                    role: 'shopkeeper'
                });
                // New shopkeeper, redirect to onboarding
                router.push('/auth/onboarding?role=shopkeeper');
            } else {
                // Existing shopkeeper
                setSuccessMessage("Login Successful! Redirecting...");
                sessionStorage.setItem('post_login_nav', 'true');
                setTimeout(() => router.push('/shopkeeper/dashboard'), 1500);
            }
            
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            if (err.code === 'auth/user-disabled') {
                setShowBlockedModal(true);
            } else if (err.code === 'auth/invalid-verification-code') {
                setShowInvalidOtpModal(true);
            } else {
                setShowGenericErrorModal(true);
            }
            setLoading(false);
        }
    };

    return (
        <>
        {showBlockedModal && (
            <div className="modal-overlay">
                 <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center', marginBottom: '25px'}}>
                        <div className="neu-icon" style={{background: '#ffdfe4', margin: '0 auto 20px'}}>
                            <AlertTriangle size={30} className="text-red-500"/>
                        </div>
                        <h2 style={{color: '#3d4468', fontSize: '1.5rem'}}>Account Blocked</h2>
                    </div>
                     <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px', fontSize: '1rem', lineHeight: 1.7}}>
                        Your account has been blocked. Please contact the support team to know the reason and get help.
                    </p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <Link href="/shopkeeper/helpline" className="neu-button" style={{margin: 0, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                           <HelpCircle size={20}/> Go to Helpline
                        </Link>
                        <button className="neu-button" onClick={() => setShowBlockedModal(false)} style={{margin: 0}}>
                            Close
                        </button>
                    </div>
                 </div>
            </div>
        )}
        {showInvalidOtpModal && (
            <div className="modal-overlay">
                 <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center', marginBottom: '25px'}}>
                        <div className="neu-icon" style={{background: '#ffdfe4', margin: '0 auto 20px'}}>
                            <AlertTriangle size={30} className="text-red-500"/>
                        </div>
                        <h2 style={{color: '#3d4468', fontSize: '1.5rem'}}>Invalid OTP</h2>
                    </div>
                     <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px', fontSize: '1rem', lineHeight: 1.7}}>
                        The code you entered is incorrect. Please check the code and try again.
                    </p>
                    <button className="neu-button" onClick={() => setShowInvalidOtpModal(false)} style={{margin: 0}}>
                        Close
                    </button>
                 </div>
            </div>
        )}
        {showGenericErrorModal && (
            <div className="modal-overlay">
                 <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center', marginBottom: '25px'}}>
                        <div className="neu-icon" style={{background: '#ffdfe4', margin: '0 auto 20px'}}>
                            <AlertTriangle size={30} className="text-red-500"/>
                        </div>
                        <h2 style={{color: '#3d4468', fontSize: '1.5rem'}}>Error</h2>
                    </div>
                     <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px', fontSize: '1rem', lineHeight: 1.7}}>
                        An unexpected error occurred. Please try again later.
                    </p>
                    <button className="neu-button" onClick={() => setShowGenericErrorModal(false)} style={{margin: 0}}>
                        Close
                    </button>
                 </div>
            </div>
        )}
        <div className="login-container-wrapper">
            <div className="login-container">
                <div className="login-card">
                    {!isOtpSent ? (
                        <>
                            <div className="login-header">
                                <div className="neu-icon"><div className="icon-inner"><Store /></div></div>
                                <h2>Shopkeeper Login</h2>
                                <p>Enter your phone number to receive an OTP</p>
                            </div>
                            <form className="login-form" noValidate onSubmit={(e) => { e.preventDefault(); handleSendOtp(false); }}>
                                <div className="form-group">
                                    <div className="neu-input">
                                        <input type="tel" id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required placeholder=" " maxLength={10} />
                                        <label htmlFor="phone">10-Digit Mobile Number</label>
                                        <div className="input-icon"><Phone /></div>
                                    </div>
                                </div>
                                <div id="recaptcha-container"></div>
                                {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading} style={{marginBottom: 0}}>
                                    <span className="btn-text">Send OTP</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>
                            </form>
                            <div className="divider">
                                <div className="divider-line"></div>
                                <span>OR</span>
                                <div className="divider-line"></div>
                            </div>
                            <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="neu-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 'auto', marginBottom: 0 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.61-3.657-11.303-8H6.393c3.561 7.625 11.233 13 19.607 13z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.572 36.833 48 30.865 48 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
                                Sign in with Google
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="login-header">
                                <div className="neu-icon"><div className="icon-inner"><Shield /></div></div>
                                <h2>Verify OTP</h2>
                                <p>Enter the 6-digit code sent to +91{phoneNumber}</p>
                            </div>
                             {successMessage && !error && <p style={{color: '#00c896', textAlign: 'center', fontWeight: 500, marginBottom: '20px'}}>{successMessage}</p>}
                            <form className="login-form" noValidate onSubmit={handleVerifyOtp}>
                                <div className="form-group">
                                    <div className="neu-input">
                                        <input type="tel" id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder=" " maxLength={6} />
                                        <label htmlFor="otp">6-Digit OTP</label>
                                        <div className="input-icon"><MessageCircle /></div>
                                    </div>
                                </div>
                                {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading} style={{marginBottom: '15px'}}>
                                    <span className="btn-text">Verify & Sign In</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>

                                <div style={{ textAlign: 'center', color: '#6c7293', fontSize: '14px' }}>
                                    {canResend ? (
                                        <button 
                                            type="button"
                                            onClick={handleResend}
                                            className="forgot-link"
                                            style={{background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600}}
                                            disabled={loading}
                                        >
                                            Resend OTP
                                        </button>
                                    ) : (
                                        <span>Resend OTP in {timer}s</span>
                                    )}
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
