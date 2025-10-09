'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './auth.css';
import { User, Store, Lock, Shield, X } from 'lucide-react';
import Link from 'next/link';

export default function AuthRoleSelectionPage() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Secret trigger state
    const [clickCount, setClickCount] = useState(0);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);

    // This PIN is now just a key to open the login route, not for authentication itself.
    const CORRECT_PIN = "998877"; 

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin) {
            setPinError('PIN is required.');
            return;
        }
        setLoading(true);
        setPinError('');

        // Simulate a check
        setTimeout(() => {
            if (pin === CORRECT_PIN) {
                // On correct PIN, redirect to the dedicated owner login page.
                router.push('/login/owner');
            } else {
                 setPinError('Incorrect PIN. Access denied.');
                 setTimeout(() => {
                     setIsModalOpen(false);
                     setPin('');
                 }, 1500);
            }
            setLoading(false);
        }, 500);
    };
    
    const handleSecretClick = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
        }

        const newClickCount = clickCount + 1;
        setClickCount(newClickCount);

        if (newClickCount >= 7) {
            setIsModalOpen(true);
            setClickCount(0);
        } else {
            clickTimer.current = setTimeout(() => {
                setClickCount(0);
            }, 3000); // Reset after 3 seconds of inactivity
        }
    };

    const closeModal = () => {
        if (loading) return;
        setIsModalOpen(false);
        setPinError('');
        setPin('');
    };

    return (
        <main className="role-selection-container">
          <div style={{width: '100%', maxWidth: '450px'}}>
            <div className="login-card role-card">
                <div className="login-header">
                    <h2 style={{ fontSize: '1.75rem', cursor: 'pointer' }} onClick={handleSecretClick}>Choose Your Role</h2>
                    <p>Select how you want to sign in to the platform.</p>
                </div>

                <div className="role-buttons-wrapper">
                    <Link href="/login/customer" className="neu-button role-btn">
                        <User className="role-icon" />
                        <span>I am a Customer</span>
                    </Link>
                    <Link href="/login/shopkeeper" className="neu-button role-btn">
                        <Store className="role-icon" />
                        <span>I am a Shopkeeper</span>
                    </Link>
                </div>
            </div>
             <footer style={{ marginTop: '30px', textAlign: 'center', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <Link href="/policy/terms" className="forgot-link">Terms & Conditions</Link>
                    <Link href="/policy/privacy" className="forgot-link">Privacy Policy</Link>
                    <Link href="/policy/refund" className="forgot-link">Refund Policy</Link>
                    <Link href="/policy/shipping" className="forgot-link">Shipping Policy</Link>
                </div>
             </footer>
          </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="login-card modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Owner Access</h2>
                            <button className="close-button" onClick={closeModal} aria-label="Close">
                                <X size={28} />
                            </button>
                        </div>
                        <form onSubmit={handlePinSubmit}>
                            <div className="form-group">
                                <div className="neu-input">
                                    <input 
                                        type="password" 
                                        id="pin" 
                                        name="pin"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        required 
                                        placeholder=" "
                                        autoComplete="off"
                                        maxLength={6}
                                        className="pin-input"
                                    />
                                    <label htmlFor="pin">Enter Security PIN</label>
                                    <div className="input-icon"><Lock /></div>
                                </div>
                                {pinError && <span className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{pinError}</span>}
                            </div>
                            <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                                <span className="btn-text">Unlock</span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
