'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Phone, Shield, MessageCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueShopkeeperCode } from '@/lib/code-helpers';

// Extend Window interface to allow storing variables globally
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.53-2.03 3.32v2.75h3.53c2.07-1.9 3.27-4.72 3.27-7.98z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.53-2.75c-.98.66-2.23 1.06-3.75 1.06-2.85 0-5.26-1.92-6.12-4.5H2.3v2.84C4.13 20.98 7.8 23 12 23z"/>
        <path fill="#FBBC05" d="M5.88 14.25c-.23-.66-.36-1.37-.36-2.1s.13-1.44.36-2.1V7.21H2.3C1.42 8.84 1 10.36 1 12s.42 3.16 1.2 4.79l3.68-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.12-3.12C17.46 2.14 14.97 1 12 1 7.8 1 4.13 3.02 2.3 6.12l3.58 2.83c.86-2.58 3.27-4.5 6.12-4.5z"/>
    </svg>
);

export default function ShopkeeperAuthPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!isOtpSent && auth && !window.recaptchaVerifier) {
            const container = document.getElementById('recaptcha-container');
            if (container) {
                container.innerHTML = ''; // Clear previous instance
                const verifier = new RecaptchaVerifier(auth, container, {
                    'size': 'normal',
                    'callback': () => console.log("reCAPTCHA solved"),
                    'expired-callback': () => {
                        if (window.recaptchaVerifier) {
                            window.recaptchaVerifier.render().catch(console.error);
                        }
                    }
                });
                window.recaptchaVerifier = verifier;
                verifier.render().catch((err) => {
                    console.error("reCAPTCHA render error:", err);
                    setError("Could not load reCAPTCHA. Please refresh.");
                });
            }
        }
    }, [isOtpSent, auth]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not ready. Please wait.");
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
            setError(err.message || "Failed to send OTP.");
            window.recaptchaVerifier.render().catch(console.error);
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

            // Check if user doc exists, if not, create it
            const userDocRef = doc(firestore, 'shopkeepers', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: 'New Shopkeeper',
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    shopkeeperCode: await generateUniqueShopkeeperCode(firestore),
                    connections: [],
                    role: 'shopkeeper'
                });
            }

            setSuccessMessage("Login Successful! Redirecting...");
            localStorage.setItem('activeRole', 'shopkeeper');
            setTimeout(() => router.push('/shopkeeper/dashboard'), 2000);
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            setError(err.message || "Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDocRef = doc(firestore, 'shopkeepers', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                 await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    phoneNumber: user.phoneNumber,
                    createdAt: serverTimestamp(),
                    shopkeeperCode: await generateUniqueShopkeeperCode(firestore),
                    connections: [],
                    role: 'shopkeeper'
                });
            }

            localStorage.setItem('activeRole', 'shopkeeper');
            router.push('/shopkeeper/dashboard');

        } catch (err: any) {
            console.error("Google Sign-In Error:", err);
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setGoogleLoading(false);
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
                                <div id="recaptcha-container" style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}></div>
                                {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                    <span className="btn-text">Send OTP</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>
                            </form>
                            <div className="divider">
                                <div className="divider-line"></div>
                                <span>OR</span>
                                <div className="divider-line"></div>
                            </div>
                            <button onClick={handleGoogleSignIn} className={`neu-button social-google ${googleLoading ? 'loading' : ''}`} disabled={googleLoading} style={{marginBottom: 0}}>
                                <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                    <GoogleIcon />
                                    Sign in with Google
                                </span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="login-header">
                                <div className="neu-icon"><div className="icon-inner"><Shield /></div></div>
                                <h2>Verify OTP</h2>
                                <p>Enter the 6-digit code sent to +91{phoneNumber}</p>
                            </div>
                             {successMessage && <p style={{color: '#00c896', textAlign: 'center', fontWeight: 500, marginBottom: '20px'}}>{successMessage}</p>}
                            <form className="login-form" noValidate onSubmit={handleVerifyOtp}>
                                <div className="form-group">
                                    <div className="neu-input">
                                        <input type="tel" id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder=" " maxLength={6} />
                                        <label htmlFor="otp">6-Digit OTP</label>
                                        <div className="input-icon"><MessageCircle /></div>
                                    </div>
                                </div>
                                {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
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
