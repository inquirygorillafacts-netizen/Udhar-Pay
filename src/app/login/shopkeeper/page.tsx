'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Phone, Check, Shield, MessageCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

// Extend Window interface to allow storing variables globally
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function ShopkeeperAuthPage() {
    const { auth } = useFirebase();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // This effect runs once when the component mounts
        if (auth && !window.recaptchaVerifier) {
            try {
                // Ensure the container is empty before rendering
                const container = document.getElementById('recaptcha-container');
                if (container) {
                    container.innerHTML = '';
                }

                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {});
                window.recaptchaVerifier = verifier;
                verifier.render();
            } catch (e) {
                console.error("reCAPTCHA render error:", e);
                setError("Could not load reCAPTCHA. Please refresh the page.");
            }
        }
    }, [auth]);

    const handleSendOtp = async () => {
        setError('');
        setLoading(true);

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not initialized. Please refresh.");
            setLoading(false);
            return;
        }

        try {
            const confirmationResult = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setIsOtpSent(true);
            setSuccessMessage("OTP sent successfully!");
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setError(err.message || "Failed to send OTP. Please check the number and try again.");
            // Reset reCAPTCHA for the user to try again
            window.recaptchaVerifier.render();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        setLoading(true);
        if (!window.confirmationResult) {
            setError("Confirmation result not found. Please request a new OTP.");
            setLoading(false);
            return;
        }

        try {
            const result = await window.confirmationResult.confirm(otp);
            const user = result.user;
            console.log("User signed in successfully:", user);
            setSuccessMessage("Login Successful! Redirecting...");
            localStorage.setItem('activeRole', 'shopkeeper');
            setTimeout(() => router.push('/shopkeeper/dashboard'), 2000);
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            setError(err.message || "Invalid OTP. Please try again.");
        } finally {
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
                                <div className="neu-icon"><Store /></div>
                                <h2>Shopkeeper Login</h2>
                                <p>Enter your phone number to receive an OTP</p>
                            </div>
                            <form className="login-form" noValidate onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
                                <div className="form-group">
                                    <div className="neu-input">
                                        <input type="tel" id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required placeholder=" " maxLength={10} />
                                        <label htmlFor="phone">10-Digit Mobile Number</label>
                                        <div className="input-icon"><Phone /></div>
                                    </div>
                                </div>
                                <div id="recaptcha-container" style={{ margin: '20px 0' }}></div>
                                {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                    <span className="btn-text">Send OTP</span>
                                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="login-header">
                                <div className="neu-icon"><Shield /></div>
                                <h2>Verify OTP</h2>
                                <p>Enter the 6-digit code sent to +91{phoneNumber}</p>
                            </div>
                             {successMessage && <p style={{color: '#00c896', textAlign: 'center', fontWeight: 500, marginBottom: '20px'}}>{successMessage}</p>}
                            <form className="login-form" noValidate onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
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
