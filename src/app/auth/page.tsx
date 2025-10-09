'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './auth.css';
import { User, Store, Lock, Shield, X } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function AuthRoleSelectionPage() {
    const router = useRouter();
    const firestore = useFirestore(); // Directly use useFirestore
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLockVisible, setIsLockVisible] = useState(true);

    useEffect(() => {
        const lockoutTime = localStorage.getItem('lockoutUntil');
        if (lockoutTime) {
            const remainingTime = Number(lockoutTime) - Date.now();
            if (remainingTime > 0) {
                setIsLockVisible(false);
                setTimeout(() => setIsLockVisible(true), remainingTime);
            }
        }
    }, []);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin) {
            setPinError('PIN is required.');
            return;
        }
        setLoading(true);
        setPinError('');

        try {
            const pinDocRef = doc(firestore, 'lock', 'owner_pin');
            const pinDoc = await getDoc(pinDocRef);

            if (pinDoc.exists()) {
                const correctPin = pinDoc.data().pin;
                if (pin === correctPin) {
                    setIsOwnerUnlocked(true);
                    setIsModalOpen(false);
                    setPin('');
                } else {
                    setPinError('Incorrect PIN. Access denied.');
                    // Lock out for 30 seconds
                    const lockoutDuration = 30000;
                    const lockoutUntil = Date.now() + lockoutDuration;
                    localStorage.setItem('lockoutUntil', String(lockoutUntil));
                    
                    // Hide modal and lock icon, then show lock icon after timeout
                    setTimeout(() => {
                        setIsModalOpen(false);
                        setIsLockVisible(false);
                        setTimeout(() => {
                            setIsLockVisible(true);
                            localStorage.removeItem('lockoutUntil');
                        }, lockoutDuration);
                    }, 2000); // Show error for 2 seconds
                }
            } else {
                setPinError('PIN configuration not found. Contact admin.');
            }
        } catch (error) {
            console.error("Error verifying PIN:", error);
            setPinError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
            setPin('');
        }
    };

    const openModal = () => setIsModalOpen(true);
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
                    <h2 style={{ fontSize: '1.75rem' }}>Choose Your Role</h2>
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
                    
                    {isOwnerUnlocked && (
                         <Link href="/login/owner" className="neu-button role-btn owner-btn">
                            <Shield className="role-icon" />
                            <span>Owner Login</span>
                        </Link>
                    )}
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
            
            {!isOwnerUnlocked && isLockVisible && (
                <button className="neu-button lock-btn" onClick={openModal} aria-label="Owner Access">
                    <Lock />
                </button>
            )}

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
