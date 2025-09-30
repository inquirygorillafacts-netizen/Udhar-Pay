'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './auth.css';
import { User, Store, Lock, Shield, X } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc } from 'firebase/firestore';

export default function AuthRoleSelectionPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
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

    const handleRoleSelect = (role: 'customer' | 'shopkeeper' | 'owner') => {
        router.push(`/${role}/login`);
    };

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
                    setPinError('माफ कीजिए आप गलत मार्ग पर आ गए है |');
                    const lockoutDuration = 30000;
                    const lockoutUntil = Date.now() + lockoutDuration;
                    localStorage.setItem('lockoutUntil', String(lockoutUntil));
                    
                    setTimeout(() => {
                        setIsModalOpen(false);
                        setIsLockVisible(false);
                        setTimeout(() => {
                            setIsLockVisible(true);
                            localStorage.removeItem('lockoutUntil');
                        }, lockoutDuration);
                    }, 2000); 
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

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <main className="role-selection-container">
            <div className="login-card role-card">
                <div className="login-header">
                    <h2 style={{ fontSize: '1.75rem' }}>Choose Your Role</h2>
                    <p>Select how you want to sign in to the platform.</p>
                </div>

                <div className="role-buttons-wrapper">
                    <button className="neu-button role-btn" onClick={() => handleRoleSelect('customer')}>
                        <User className="role-icon" />
                        <span>I am a Customer</span>
                    </button>
                    <button className="neu-button role-btn" onClick={() => handleRoleSelect('shopkeeper')}>
                        <Store className="role-icon" />
                        <span>I am a Shopkeeper</span>
                    </button>
                    
                    {isOwnerUnlocked && (
                         <button className="neu-button role-btn owner-btn" onClick={() => handleRoleSelect('owner')}>
                            <Shield className="role-icon" />
                            <span>Owner Login</span>
                        </button>
                    )}
                </div>
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
