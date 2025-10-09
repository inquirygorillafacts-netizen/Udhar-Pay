'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Phone, Shield, MessageCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
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
    
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (!auth) return;

         const setupRecaptcha = () => {
             if (!window.recaptchaVerifier || window.recaptchaVerifier.auth.app !== auth.app) {
                const container = document.getElementById('recaptcha-container');
                if (container) {
                    container.innerHTML = ''; // Clear previous instance
                     const verifier = new RecaptchaVerifier(auth, container, {
                        'size': 'invisible', // Invisible reCAPTCHA
                        'callback': () => {},
                    });
                    window.recaptchaVerifier = verifier;
                }
            }
        };

        const timerId = setTimeout(setupRecaptcha, 100);

        return () => clearTimeout(timerId);
    }, [auth]);

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

    const handleSendOtp = async (e: React.FormEvent, isResend = false) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not ready. Please wait a moment and try again.");
            setLoading(false);
            return;
        }

        try {
            const fullPhoneNumber = `+91${phoneNumber}`;
            const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setIsOtpSent(true);
            setSuccessMessage("OTP sent successfully!");
            if(isResend) resetTimer();
        } catch (err: any) {
            console.error("Error sending OTP:", err);
             if (err.code === 'auth/user-disabled') {
                setShowBlockedModal(true);
            } else {
                setError(err.message || "Failed to send OTP. Please check the number and try again.");
            }
        } finally {
            setLoading(false);
        }
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
            } else {
                setError(err.message || "Invalid OTP.");
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
                            <form className="login-form" noValidate onSubmit={handleSendOtp}>
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
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading || canResend} style={{marginBottom: '15px'}}>
                                    <span className="btn-text">Verify & Sign In</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>

                                <div style={{ textAlign: 'center', color: '#6c7293', fontSize: '14px' }}>
                                    {canResend ? (
                                        <button 
                                            type="button"
                                            onClick={(e) => handleSendOtp(e, true)}
                                            disabled={loading}
                                            className="forgot-link"
                                            style={{background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600}}
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
