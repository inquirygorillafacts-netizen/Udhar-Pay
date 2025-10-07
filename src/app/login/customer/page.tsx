'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './customer.css';
import { User, Phone, Shield, MessageCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

// Extend Window interface to allow storing variables globally
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function CustomerAuthPage() {
    const { auth } = useFirebase();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // This effect runs only when isOtpSent becomes false, which is the initial state.
        // It sets up the reCAPTCHA verifier.
        if (!isOtpSent && auth) {
            if (!window.recaptchaVerifier) {
                // Ensure the container is empty before rendering to avoid conflicts on re-renders
                const container = document.getElementById('recaptcha-container');
                if (container) {
                    container.innerHTML = '';
                    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'normal', // Use 'normal' for the visible checkbox
                        'callback': (response: any) => {
                            // reCAPTCHA solved, you can enable the send OTP button here if needed
                            console.log("reCAPTCHA solved");
                        },
                        'expired-callback': () => {
                            // Response expired. Ask user to solve reCAPTCHA again.
                             if (window.recaptchaVerifier) {
                                window.recaptchaVerifier.render().catch(console.error);
                            }
                        }
                    });
                    window.recaptchaVerifier = verifier;
                    verifier.render().catch((err) => {
                        console.error("reCAPTCHA render error:", err);
                        setError("Could not load reCAPTCHA. Please refresh the page.");
                    });
                }
            }
        }
    }, [isOtpSent, auth]);

    const handleSendOtp = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setError(err.message || "Failed to send OTP. Please check the number and try again.");
            // In case of error, re-render reCAPTCHA
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().catch(console.error);
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
            setError("Confirmation result not found. Please request a new OTP.");
            setLoading(false);
            return;
        }

        try {
            const result = await window.confirmationResult.confirm(otp);
            console.log("User signed in successfully:", result.user);
            setSuccessMessage("Login Successful! Redirecting...");
            localStorage.setItem('activeRole', 'customer');
            setTimeout(() => router.push('/customer/dashboard'), 2000);
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
                                <div className="neu-icon"><div className="icon-inner"><User /></div></div>
                                <h2>Customer Login</h2>
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
