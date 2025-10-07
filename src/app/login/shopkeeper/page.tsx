'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Phone, Shield, MessageCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueShopkeeperCode } from '@/lib/code-helpers';

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

    useEffect(() => {
        if (!auth || isOtpSent) return;

        // Delay rendering reCAPTCHA to ensure Firebase is ready
        const timer = setTimeout(() => {
            if (!window.recaptchaVerifier) {
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
        }, 500);

        return () => clearTimeout(timer);
    }, [auth, isOtpSent]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not ready. Please wait a moment.");
            setLoading(false);
            return;
        }

        try {
            const fullPhoneNumber = `+91${phoneNumber}`;
            const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setIsOtpSent(true);
            setSuccessMessage("OTP sent successfully!");
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setError(err.message || "Failed to send OTP. Please check the number and try again.");
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
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName || 'New Shopkeeper',
                    email: user.email,
                    mobileNumber: user.phoneNumber, // Correctly save the phone number here
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    shopkeeperCode: await generateUniqueShopkeeperCode(firestore),
                    connections: [],
                    role: 'shopkeeper'
                });
            }

            setSuccessMessage("Login Successful! Redirecting...");
            localStorage.setItem('activeRole', 'shopkeeper');
            setTimeout(() => router.push('/shopkeeper/dashboard'), 1500);
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            setError(err.message || "Invalid OTP.");
            setLoading(false);
        }
    };

    return (
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
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading} style={{marginBottom: 0}}>
                                    <span className="btn-text">Verify & Sign In</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
