'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './shopkeeper.css';
import { Store, Key, Check, User, ArrowLeft, ChevronDown } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { 
    signInWithPhoneNumber,
    RecaptchaVerifier,
    type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueShopkeeperCode } from '@/lib/code-helpers';


const countryCodes = [
    { code: '+91', country: 'IN', flag: '🇮🇳' },
    { code: '+92', country: 'PK', flag: '🇵🇰' },
    { code: '+1', country: 'US', flag: '🇺🇸' },
];


export default function ShopkeeperAuthPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState<{ phone?: string; otp?: string; form?: string }>({});
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);
    const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);

    const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!auth || (window as any).recaptchaVerifier) return;
        
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'send-code-btn-shopkeeper', {
            'size': 'invisible',
            'callback': () => {
                setIsRecaptchaReady(true);
            },
            'expired-callback': () => {
                setErrors({ form: "reCAPTCHA expired. Please try sending OTP again." });
                setIsRecaptchaReady(false);
            }
        });
        
        (window as any).recaptchaVerifier = recaptchaVerifier;
        
        recaptchaVerifier.render().then(() => {
            setIsRecaptchaReady(true);
        }).catch((error) => {
            console.error("reCAPTCHA render error:", error);
            setErrors({form: "Could not initialize reCAPTCHA. Please refresh."});
            setIsRecaptchaReady(false);
        });

    }, [auth]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


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

        const appVerifier = (window as any).recaptchaVerifier;
        if (!appVerifier) {
            setErrors({ form: "reCAPTCHA verifier not initialized. Please refresh." });
            setLoading(false);
            return;
        }

        try {
            const fullPhoneNumber = `${selectedCountry.code}${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(confirmation);
        } catch (error: any) {
            console.error("OTP send error:", error);
            let errorMessage = "Failed to send OTP. Please check the number and try again.";
             if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many requests. Please try again later.";
            } else if (error.code === 'auth/invalid-phone-number') {
                errorMessage = "The phone number is not valid.";
            } else if (error.code === 'auth/captcha-check-failed' || error.code === 'auth/network-request-failed') {
                 errorMessage = "Verification failed. This can happen with ad-blockers, network issues, or if the authorized domain is not set in Firebase. Please check your connection or contact support.";
            }
            setErrors({ form: errorMessage });
             appVerifier.render().then((widgetId: any) => {
                if((window as any).grecaptcha) {
                    (window as any).grecaptcha.reset(widgetId);
                }
            });
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
                                        <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                                            <div ref={dropdownRef} style={{position: 'relative'}}>
                                                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '0 15px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer'}}>
                                                    <span>{selectedCountry.flag}</span>
                                                    <ChevronDown size={16} style={{color: '#9499b7', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none'}}/>
                                                </button>
                                                {isDropdownOpen && (
                                                    <div style={{position: 'absolute', top: '110%', left: '0', background: '#e0e5ec', borderRadius: '15px', boxShadow: '8px 8px 20px #bec3cf, -8px -8px 20px #ffffff', zIndex: 10, overflow: 'hidden'}}>
                                                        {countryCodes.map(country => (
                                                            <div key={country.code} onClick={() => { setSelectedCountry(country); setIsDropdownOpen(false); }} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', cursor: 'pointer', hover: {background: '#d1d9e6'}}}>
                                                                <span>{country.flag}</span>
                                                                <span style={{color: '#3d4468', fontWeight: 500}}>{country.code}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{width: '2px', height: '30px', background: '#d1d9e6'}}></div>
                                            <input type="tel" id="phone" name="phone" required autoComplete="tel" placeholder=" " value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} style={{flex: 1, paddingLeft: '15px', border: 'none', background: 'transparent', outline: 'none'}} />
                                            <label htmlFor="phone" style={{left: '120px'}}>Mobile Number</label>
                                        </div>
                                        {errors.phone && <span className="error-message show">{errors.phone}</span>}
                                    </div>
                                    <button id="send-code-btn-shopkeeper" type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading || !isRecaptchaReady}>
                                        <span className="btn-text">{isRecaptchaReady ? 'Send OTP' : 'Initializing...'}</span>
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
