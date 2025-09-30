'use client';

import { useState, useEffect, useRef } from 'react';
import './customer.css';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
);

const GithubIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
);

const TwitterIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
);

export default function CustomerAuthPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const handlePasswordToggle = () => {
        setShowPassword(!showPassword);
    };

    const validateEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setErrors(prev => ({ ...prev, email: 'Email is required' }));
            return false;
        }
        if (!emailRegex.test(email)) {
            setErrors(prev => ({ ...prev, email: 'Please enter a valid email' }));
            return false;
        }
        setErrors(prev => ({ ...prev, email: undefined }));
        return true;
    };

    const validatePassword = () => {
        if (!password) {
            setErrors(prev => ({ ...prev, password: 'Password is required' }));
            return false;
        }
        if (password.length < 6) {
            setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
            return false;
        }
        setErrors(prev => ({ ...prev, password: undefined }));
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoading(false);
        
        // On successful login
        const formElements = document.querySelectorAll('.login-form, .divider, .social-login, .signup-link');
        formElements.forEach(el => el.classList.add('form-hiding'));
        
        setTimeout(() => {
            setShowSuccess(true);
        }, 300);
        
        setTimeout(() => {
             console.log('Redirecting to dashboard...');
             // router.push('/customer/dashboard');
        }, 2800);
    };
    
    // Ambient light effect on mouse move
    useEffect(() => {
        const card = document.querySelector('.login-card') as HTMLDivElement;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
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
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                </div>
                                <h2>Welcome back</h2>
                                <p>Please sign in to continue</p>
                            </div>
                            
                            <form className="login-form" noValidate onSubmit={handleSubmit}>
                                <div className={`form-group ${errors.email ? 'error' : ''}`}>
                                    <div className="neu-input">
                                        <input type="email" id="email" name="email" required autoComplete="email" placeholder=" " value={email} onChange={e => setEmail(e.target.value)} onBlur={validateEmail} />
                                        <label htmlFor="email">Email address</label>
                                        <div className="input-icon"><Mail /></div>
                                    </div>
                                    {errors.email && <span className="error-message show">{errors.email}</span>}
                                </div>

                                <div className={`form-group ${errors.password ? 'error' : ''}`}>
                                    <div className="neu-input password-group">
                                        <input type={showPassword ? 'text' : 'password'} id="password" name="password" required autoComplete="current-password" placeholder=" " value={password} onChange={e => setPassword(e.target.value)} onBlur={validatePassword}/>
                                        <label htmlFor="password">Password</label>
                                        <div className="input-icon"><Lock /></div>
                                        <button type="button" className="neu-toggle" aria-label="Toggle password visibility" onClick={handlePasswordToggle}>
                                           {showPassword ? <EyeOff /> : <Eye />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="error-message show">{errors.password}</span>}
                                </div>

                                <div className="form-options">
                                    <div className="remember-wrapper">
                                        <input type="checkbox" id="remember" name="remember"/>
                                        <label htmlFor="remember" className="checkbox-label">
                                            <div className="neu-checkbox">
                                                <Check size={16} strokeWidth={3}/>
                                            </div>
                                            Remember me
                                        </label>
                                    </div>
                                    <a href="#" className="forgot-link">Forgot password?</a>
                                </div>

                                <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                    <span className="btn-text">Sign In</span>
                                    <div className="btn-loader">
                                        <div className="neu-spinner"></div>
                                    </div>
                                </button>
                            </form>

                            <div className="divider">
                                <div className="divider-line"></div>
                                <span>or continue with</span>
                                <div className="divider-line"></div>
                            </div>

                            <div className="social-login">
                                <button type="button" className="neu-social"><GoogleIcon /></button>
                                <button type="button" className="neu-social"><GithubIcon /></button>
                                <button type="button" className="neu-social"><TwitterIcon /></button>
                            </div>

                            <div className="signup-link">
                                <p>Don't have an account? <a href="#">Sign up</a></p>
                            </div>
                        </>
                    ) : (
                        <div className="success-message show">
                            <div className="neu-icon">
                               <Check size={32} strokeWidth={3} />
                            </div>
                            <h3>Success!</h3>
                            <p>Redirecting to your dashboard...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
