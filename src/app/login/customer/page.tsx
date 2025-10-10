'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './customer.css';
import { User, Phone, Shield, MessageCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueCustomerCode } from '@/lib/code-helpers';
import Link from 'next/link';


// Extend Window interface to allow storing variables globally
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function CustomerAuthPage() {
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
                    'size': 'invisible',
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
            const timerId = setTimeout(setupRecaptcha, 100); // Give it a moment to ensure DOM is ready
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
            if (interval) clearInterval(interval);
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
            // This re-initializes reCAPTCHA if it's missing, which can happen.
            setupRecaptcha();
        }

        // Give reCAPTCHA a moment to be ready, especially on a re-render.
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
                }
                else {
                    setError(err.message || "Failed to send OTP. Please check the number and try again.");
                }
            } finally {
                setLoading(false);
            }
        }, 500); // 500ms delay to ensure verifier is ready.
    };
    
    const handleResend = () => {
        setIsOtpSent(false);
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
            
            const userDocRef = doc(firestore, 'customers', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            localStorage.setItem('activeRole', 'customer');

            if (!userDoc.exists()) {
                // This is a new user, create a basic profile and redirect to onboarding
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName || null, // Start with null, will be set in onboarding
                    email: user.email,
                    mobileNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    customerCode: await generateUniqueCustomerCode(firestore),
                    connections: [],
                    role: 'customer'
                });
                router.push('/auth/onboarding?role=customer');
            } else {
                 // Existing user, redirect to dashboard
                setSuccessMessage("Login Successful! Redirecting...");
                sessionStorage.setItem('post_login_nav', 'true');
                setTimeout(() => router.push('/customer/dashboard'), 1500);
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
                        <Link href="/customer/helpline" className="neu-button" style={{margin: 0, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
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
                                <div className="neu-icon"><div className="icon-inner"><User /></div></div>
                                <h2>Customer Login</h2>
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
