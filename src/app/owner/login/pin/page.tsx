'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useFirebase } from '@/firebase';

interface PinCheckData {
    correctPin: string;
    targetPath: string;
}

export default function PinLockPage() {
    const router = useRouter();
    const { auth } = useFirebase();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pinCheckData, setPinCheckData] = useState<PinCheckData | null>(null);

    useEffect(() => {
        // Ensure user is still logged in
        if (!auth.currentUser) {
            router.replace('/login/owner');
            return;
        }

        const data = sessionStorage.getItem('pinCheckData');
        if (data) {
            setPinCheckData(JSON.parse(data));
        } else {
            // If there's no PIN data, the user shouldn't be here. Redirect them.
            router.replace('/owner/dashboard');
        }
    }, [auth, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!pin || pin.length < 8) {
            setError('Please enter your 8-digit PIN.');
            return;
        }
        if (!pinCheckData) {
            setError('Session expired. Please log in again.');
            return;
        }

        setLoading(true);

        setTimeout(() => {
            if (pin === pinCheckData.correctPin) {
                sessionStorage.removeItem('pinCheckData'); // Clean up session storage
                router.replace(pinCheckData.targetPath);
            } else {
                setError('Incorrect PIN. Access denied.');
                setLoading(false);
                setPin('');
            }
        }, 300);
    };
    
    if (!pinCheckData) {
         return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    return (
        <main className="login-container">
            <div className="login-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
                <div className="login-header">
                    <div className="neu-icon" style={{width: '70px', height: '70px'}}>
                        <div className="icon-inner"><Lock /></div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem' }}>PIN Required</h2>
                    <p>For your security, please enter your 8-digit PIN to continue.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <div className="neu-input">
                            <input
                                type="password"
                                id="pin"
                                name="pin"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                required
                                placeholder=" "
                                autoComplete="off"
                                maxLength={8}
                                className="pin-input"
                                style={{ fontSize: '1.5rem', letterSpacing: '0.8em', textAlign: 'center', paddingLeft: '24px' }}
                            />
                            <label htmlFor="pin">Security PIN</label>
                            <div className="input-icon" style={{ display: 'none' }}><Lock /></div>
                        </div>
                        {error && <span className="error-message show" style={{ textAlign: 'center', marginLeft: 0 }}>{error}</span>}
                    </div>
                    <button type="submit" className={`neu-button ${loading ? 'loading' : ''}`} disabled={loading}>
                        <span className="btn-text">Unlock Dashboard</span>
                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                    </button>
                </form>
            </div>
        </main>
    );
}
