'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Save, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ShopControlRoomPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();
    const [defaultCreditLimit, setDefaultCreditLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!auth.currentUser) return;
        
        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        getDoc(shopkeeperRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDefaultCreditLimit(data.defaultCreditLimit?.toString() || '5000');
            }
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching shopkeeper settings:", err);
            setError("सेटिंग्स लोड करने में विफल। कृपया पुनः प्रयास करें।");
            setLoading(false);
        });
    }, [auth.currentUser, firestore]);

    const handleSaveSettings = async () => {
        if (!auth.currentUser) {
            setError("आपको इस क्रिया के लिए लॉग इन होना चाहिए।");
            return;
        }

        const limit = parseFloat(defaultCreditLimit);
        if (isNaN(limit) || limit < 0) {
            setError("कृपया एक मान्य उधार सीमा दर्ज करें।");
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
            await updateDoc(shopkeeperRef, {
                defaultCreditLimit: limit
            });
            setSuccessMessage("उधार सीमा सफलतापूर्वक सेव हो गई है!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error("Error saving settings:", err);
            setError("सेटिंग्स सेव करने में विफल। कृपया पुनः प्रयास करें।");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    return (
        <div>
            <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
                <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{textAlign: 'center', flexGrow: 1}}>
                    <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>दुकान कंट्रोल रूम</h1>
                </div>
                <div style={{width: '45px'}}></div>
            </header>

            <main className="dashboard-main-content" style={{padding: '20px'}}>
                <div className="login-card" style={{maxWidth: '600px', margin: 'auto'}}>
                    <div className="setting-section">
                        <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1.2rem'}}>ग्राहक उधार सीमा</h3>
                        <p style={{color: '#9499b7', textAlign: 'center', marginTop: '-10px', marginBottom: '30px'}}>
                            अपने सभी ग्राहकों के लिए एक डिफ़ॉल्ट उधार सीमा निर्धारित करें। आप इसे बाद में बदल सकते हैं।
                        </p>
                        
                        <div className="form-group">
                            <div className="neu-input">
                                <input
                                    type="number"
                                    id="credit-limit"
                                    value={defaultCreditLimit}
                                    onChange={(e) => setDefaultCreditLimit(e.target.value)}
                                    placeholder=" "
                                    required
                                />
                                <label htmlFor="credit-limit">डिफ़ॉल्ट उधार सीमा</label>
                                <div className="input-icon"><IndianRupee /></div>
                            </div>
                        </div>

                         {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                         {successMessage && <p style={{color: '#00c896', textAlign: 'center', fontWeight: 500}}>{successMessage}</p>}

                        <button 
                            className={`neu-button ${isSaving ? 'loading' : ''}`}
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            style={{marginTop: '20px'}}
                        >
                            <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                <Save size={20} />सेटिंग्स सेव करें
                            </span>
                            <div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
