'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { onSnapshot, doc, updateDoc, collection, query, where, getDoc, Timestamp } from 'firebase/firestore';
import { LifeBuoy, Phone, UploadCloud, Lock, CheckCircle, ShieldAlert, KeyRound, HelpCircle, X, AlertTriangle, SlidersHorizontal, IndianRupee, LandPlot } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

interface ShopkeeperProfile {
    connections?: string[];
    qrCodeUrl?: string;
    qrUpdatePin?: string;
}

interface Transaction {
    id: string;
    amount: number;
    type: 'credit' | 'payment';
    customerId: string;
    shopkeeperId: string;
    timestamp: Timestamp;
}

interface Notification {
    type: 'success' | 'error';
    message: string;
}

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '833aa7bc7188c4f8d99f63e06421bbad';

export default function ShopkeeperWalletPage() {
    const { auth, firestore } = useFirebase();
    const [profile, setProfile] = useState<ShopkeeperProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [outstandingCredit, setOutstandingCredit] = useState(0);
    const [isSetupActive, setIsSetupActive] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showUpdateQrModal, setShowUpdateQrModal] = useState(false);
    const [showUpdatePinModal, setShowUpdatePinModal] = useState(false);
    const [showForgotPinModal, setShowForgotPinModal] = useState(false);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [oldPin, setOldPin] = useState('');
    const [isSavingPin, setIsSavingPin] = useState(false);
    const [pinVerificationStep, setPinVerificationStep] = useState('verify');
    const [verifiedPin, setVerifiedPin] = useState('');
    const [error, setError] = useState('');
    const [notification, setNotification] = useState<Notification | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!firestore || !auth.currentUser) {
            setLoading(false);
            return;
        }

        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        let unsubscribeShopkeeper = () => {};
        let unsubscribeTransactions = () => {};

        const setupListeners = async () => {
            setLoading(true);
            unsubscribeShopkeeper = onSnapshot(shopkeeperRef, async (shopkeeperSnap) => {
                if (shopkeeperSnap.exists()) {
                    const data = shopkeeperSnap.data() as ShopkeeperProfile;
                    setProfile(data);
                    setIsSetupActive(!!data.qrCodeUrl && !!data.qrUpdatePin);

                    const customerIds = data.connections || [];
                    if (customerIds.length > 0) {
                        const transactionsRef = collection(firestore, 'transactions');
                        const q = query(transactionsRef, where('shopkeeperId', '==', auth.currentUser!.uid));
                        
                        unsubscribeTransactions(); // Unsubscribe from old listener
                        unsubscribeTransactions = onSnapshot(q, (transactionsSnapshot) => {
                            const customerBalances: { [key: string]: number } = {};
                            customerIds.forEach((id: string) => customerBalances[id] = 0);
        
                            transactionsSnapshot.forEach((transactionDoc) => {
                                const transaction = transactionDoc.data() as Transaction;
                                if (customerBalances[transaction.customerId] !== undefined) {
                                    if (transaction.type === 'credit') {
                                        customerBalances[transaction.customerId] += transaction.amount;
                                    } else if (transaction.type === 'payment') {
                                        customerBalances[transaction.customerId] -= transaction.amount;
                                    }
                                }
                            });
        
                            const totalOutstanding = Object.values(customerBalances).reduce((sum, bal) => sum + (bal > 0 ? bal : 0), 0);
                            setOutstandingCredit(totalOutstanding);
                            setLoading(false);
                        }, (err) => {
                            console.error("Error fetching transactions:", err);
                            setLoading(false);
                        });
                    } else {
                        setOutstandingCredit(0);
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            }, (err) => {
                console.error("Error fetching shopkeeper profile:", err);
                setLoading(false);
            });
        };

        setupListeners();
    
        return () => {
            unsubscribeShopkeeper();
            unsubscribeTransactions();
        };
    }, [firestore, auth.currentUser]);


    const handleToggleChange = () => {
        if (!isSetupActive) {
            setShowQrModal(true);
        }
    };
    
    const resetAllModals = () => {
        setShowQrModal(false);
        setShowPinModal(false);
        setShowUpdateQrModal(false);
        setShowUpdatePinModal(false);
        setShowForgotPinModal(false);
        setError('');
        setPin('');
        setConfirmPin('');
        setOldPin('');
        setQrFile(null);
        setQrPreview(null);
        setVerifiedPin('');
        setPinVerificationStep('verify');
    }

    const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setQrFile(file);
            setQrPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleSaveQrCode = async (isUpdate = false) => {
        if (!qrFile || !auth.currentUser || !firestore) {
            setError("Please select a QR code image first.");
            return;
        }
        setIsUploading(true);
        setError('');
    
        const formData = new FormData();
        formData.append('image', qrFile);

        try {
            const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData);
            
            if (response.data && response.data.data && response.data.data.url) {
                const qrCodeUrl = response.data.data.url;
                const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
                await updateDoc(userRef, { qrCodeUrl: qrCodeUrl });
                
                if(isUpdate) {
                    resetAllModals();
                    setNotification({ type: 'success', message: "QR Code updated successfully!" });
                } else {
                    setShowQrModal(false);
                    setShowPinModal(true); 
                }
            } else {
                 throw new Error("Invalid response from image hosting service.");
            }
        } catch (err) {
            console.error("QR Code Upload Error:", err);
            const errorMessage = "Failed to upload QR Code. Please try a different image or try again later.";
            if(isUpdate) {
                setNotification({ type: 'error', message: errorMessage });
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleSetPin = async () => {
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            setError("PIN must be exactly 4 digits.");
            return;
        }
        if (pin !== confirmPin) {
            setError("PINs do not match.");
            return;
        }
        setIsSavingPin(true);
        setError('');
        try {
            if (!auth.currentUser) throw new Error("User not found");
            const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
            await updateDoc(userRef, { qrUpdatePin: pin });
            resetAllModals();
            setNotification({ type: 'success', message: "Security PIN set successfully!" });
        } catch (err) {
            setError("Failed to save PIN. Please try again.");
        } finally {
            setIsSavingPin(false);
        }
    };
    
    const handleVerifyPinForUpdate = async () => {
        setError('');
        if(verifiedPin.length !== 4) {
            setError('Please enter your 4-digit security PIN.');
            return;
        }
        if (verifiedPin === profile?.qrUpdatePin) {
            setPinVerificationStep('upload');
            setError('');
        } else {
            setError('Incorrect PIN. Please try again.');
        }
    }

    const handleUpdatePin = async () => {
        setError('');
        if(oldPin !== profile?.qrUpdatePin) {
            setError('Your old PIN is incorrect.');
            return;
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            setError("New PIN must be exactly 4 digits.");
            return;
        }
        if (pin !== confirmPin) {
            setError("New PINs do not match.");
            return;
        }
         setIsSavingPin(true);
        try {
            if (!auth.currentUser) throw new Error("User not found");
            const userRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
            await updateDoc(userRef, { qrUpdatePin: pin });
            resetAllModals();
            setNotification({ type: 'success', message: "Security PIN updated successfully!" });
        } catch (err) {
            resetAllModals();
            setNotification({ type: 'error', message: "Failed to update PIN. Please try again." });
        } finally {
            setIsSavingPin(false);
        }
    }

    return (
        <>
            <main className="dashboard-main-content" style={{padding: '20px'}}>
                <div style={{ maxWidth: '600px', margin: 'auto' }}>
                    
                    <div className="login-card" style={{marginBottom: '30px'}}>
                         <h3 className="setting-title" style={{textAlign: 'center', border: 'none', padding: 0, margin: '0 0 20px 0'}}>सेटिंग्स और सेवाएँ</h3>
                         <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                             <Link href="/loan/apply" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><LandPlot size={20} /><span>बिजनेस लोन के लिए आवेदन करें</span></div>
                                <span>&rarr;</span>
                            </Link>
                             <Link href="/shopkeeper/control-room" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><SlidersHorizontal size={20} /><span>उधार कंट्रोल रूम</span></div>
                                <span>&rarr;</span>
                            </Link>
                            <Link href="/shopkeeper/helpline" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><LifeBuoy size={20} /><span>हेल्पलाइन</span></div>
                                <span>&rarr;</span>
                            </Link>
                         </div>
                     </div>

                     <div className="login-card" style={{ marginBottom: '30px' }}>
                        <h3 className="setting-title" style={{textAlign: 'center', border: 'none', padding: 0, margin: '0 0 20px 0'}}>पेमेंट सेटअप</h3>
                        <div className="neu-input" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '20px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <IndianRupee size={20} style={{color: '#6c7293'}} />
                                <div>
                                    <span style={{fontWeight: 600}}>पेमेंट प्राप्त करें</span>
                                    <p style={{fontSize: '12px', color: isSetupActive ? '#00c896' : '#ff3b5c'}}>{isSetupActive ? 'सक्रिय' : 'निष्क्रिय'}</p>
                                </div>
                            </div>
                            <div className={`neu-toggle-switch ${isSetupActive ? 'active' : ''}`} onClick={handleToggleChange}>
                                <div className="neu-toggle-handle"></div>
                            </div>
                        </div>
                        {isSetupActive && (
                             <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', borderTop: '1px solid #d1d9e6', paddingTop: '20px'}}>
                                <button onClick={() => setShowUpdateQrModal(true)} className="neu-button" style={{margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}><UploadCloud size={20}/>QR कोड अपडेट करें</button>
                                <button onClick={() => setShowUpdatePinModal(true)} className="neu-button" style={{margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}><KeyRound size={20}/>PIN बदलें</button>
                                <button onClick={() => setShowForgotPinModal(true)} className="neu-button" style={{margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}><HelpCircle size={20}/>PIN भूल गए?</button>
                            </div>
                        )}
                    </div>
                     
                    <div className="login-card" style={{ textAlign: 'center', marginBottom: '30px' }}>
                         <div style={{ padding: '15px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff' }}>
                            <p style={{ color: '#6c7293', margin: 0, textAlign: 'center', fontSize: '14px', width: '100%', marginBottom: '5px' }}>
                                आपकी हफ़्ते भर की कमाई का पैसा हर रविवार को आपके खाते में भेज दिया जाएगा।
                            </p>
                            <p style={{ color: '#3d4468', fontWeight: '600', margin: 0, textAlign: 'center', fontSize: '14px', width: '100%' }}>
                                Sunday 10:00 am → 4:00 pm
                            </p>
                        </div>
                    </div>

                    <div className="login-card" style={{ textAlign: 'center' }}>
                         <div className="login-header" style={{marginBottom: '25px'}}>
                            <h2 style={{fontSize: '1.5rem'}}>पेमेंट जल्दी चाहिए?</h2>
                         </div>
                         <div style={{ padding: '20px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', marginBottom: '30px' }}>
                            <p style={{ color: '#6c7293', margin: 0, textAlign: 'center', fontSize: '14px', lineHeight: '1.8' }}>
                               अगर आपको किसी कारण से रविवार से पहले पेमेंट चाहिए, तो आप जब चाहें अपना पेमेंट ले सकते हैं। यदि कोई ज़्यादा ज़रूरत नहीं है, तो आपका पेमेंट हर रविवार को अपने-आप भेज दिया जाएगा।
                            </p>
                        </div>
                        <a href="tel:8302806913" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#00c896', color: 'white' }}>
                            <Phone size={20} />
                            <span>ज़रूरी पेमेंट के लिए कॉल करें</span>
                        </a>
                    </div>
                </div>
            </main>

            {notification && (
                <div className="modal-overlay" onClick={() => setNotification(null)}>
                    <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{alignItems: 'center', gap: '15px'}}>
                            {notification.type === 'success' ? (
                                <div className="neu-icon" style={{color: 'white', background: '#00c896', margin: 0, width: '60px', height: '60px'}}><CheckCircle size={30} /></div>
                            ) : (
                                <div className="neu-icon" style={{color: 'white', background: '#ff3b5c', margin: 0, width: '60px', height: '60px'}}><AlertTriangle size={30} /></div>
                            )}
                            <h2 style={{fontSize: '1.5rem', color: notification.type === 'success' ? '#00c896' : '#ff3b5c'}}>
                                {notification.type === 'success' ? 'Success' : 'Error'}
                            </h2>
                        </div>
                        <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '25px'}}>{notification.message}</p>
                        <button className="neu-button" style={{margin: 0}} onClick={() => setNotification(null)}>Close</button>
                    </div>
                </div>
            )}

            {showQrModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}}>
                        <div className="modal-header"><h2 style={{fontSize: '1.5rem'}}>Upload QR Code</h2><button className="close-button" onClick={resetAllModals}>&times;</button></div>
                        <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>अपना पेमेंट QR कोड अपलोड करें ताकि ग्राहक आपको भुगतान कर सकें।</p>
                        <div onClick={() => fileInputRef.current?.click()} className="neu-input" style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', padding: '20px' }}>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleQrFileChange} />
                            {qrPreview ? <img src={qrPreview} alt="QR Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '10px', objectFit: 'contain' }} /> : <div style={{textAlign: 'center', color: '#6c7293'}}><UploadCloud size={40} style={{margin: '0 auto 10px'}} /><p>Click to upload</p></div>}
                        </div>
                        {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
                        <button className={`neu-button ${isUploading ? 'loading' : ''}`} onClick={() => handleSaveQrCode(false)} disabled={!qrFile || isUploading} style={{marginTop: '30px', background: '#00c896', color: 'white'}}>
                            <span className="btn-text">Save and Continue</span><div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                    </div>
                </div>
            )}
            
            {showPinModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}}>
                        <div className="modal-header"><div className="neu-icon" style={{color: '#3d4468', margin: '0 15px 0 0', width: '60px', height: '60px'}}><ShieldAlert size={30} /></div><h2 style={{fontSize: '1.5rem'}}>Set Security PIN</h2></div>
                        <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>QR कोड को भविष्य में बदलने के लिए एक 4-अंकों का PIN सेट करें। यह आपके खाते को सुरक्षित रखेगा।</p>
                        <div className="form-group"><div className="neu-input"><input type="password" id="pin" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="pin">Enter 4-digit PIN</label><div className="input-icon"><Lock/></div></div></div>
                        <div className="form-group"><div className="neu-input"><input type="password" id="confirmPin" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="confirmPin">Confirm PIN</label><div className="input-icon"><Lock/></div></div></div>
                        {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
                        <button className={`neu-button ${isSavingPin ? 'loading' : ''}`} onClick={handleSetPin} disabled={isSavingPin}><span className="btn-text">Set PIN and Finish</span><div className="btn-loader"><div className="neu-spinner"></div></div></button>
                    </div>
                </div>
            )}
            
            {showUpdateQrModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}}>
                        <div className="modal-header"><h2 style={{fontSize: '1.5rem'}}>Update QR Code</h2><button className="close-button" onClick={resetAllModals}>&times;</button></div>
                        {pinVerificationStep === 'verify' ? (
                            <>
                                <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>सुरक्षा के लिए, कृपया अपना 4-अंकों का QR अपडेट PIN दर्ज करें।</p>
                                <div className="form-group"><div className="neu-input"><input type="password" id="verifyPin" maxLength={4} value={verifiedPin} onChange={(e) => setVerifiedPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="verifyPin">Enter Security PIN</label><div className="input-icon"><Lock/></div></div></div>
                                {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
                                <button className="neu-button" onClick={handleVerifyPinForUpdate} style={{marginTop: '10px'}}><span className="btn-text">Verify PIN</span></button>
                            </>
                        ) : (
                            <>
                                <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>PIN Verified. Please upload your new QR code.</p>
                                <div onClick={() => fileInputRef.current?.click()} className="neu-input" style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', padding: '20px' }}>
                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleQrFileChange} />
                                    {qrPreview ? <img src={qrPreview} alt="QR Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '10px', objectFit: 'contain' }} /> : <div style={{textAlign: 'center', color: '#6c7293'}}><UploadCloud size={40} style={{margin: '0 auto 10px'}} /><p>Click to upload new QR</p></div>}
                                </div>
                                {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
                                <button className={`neu-button ${isUploading ? 'loading' : ''}`} onClick={() => handleSaveQrCode(true)} disabled={!qrFile || isUploading} style={{marginTop: '30px', background: '#00c896', color: 'white'}}>
                                    <span className="btn-text">Update QR Code</span><div className="btn-loader"><div className="neu-spinner"></div></div>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {showUpdatePinModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}}>
                        <div className="modal-header"><h2 style={{fontSize: '1.5rem'}}>Update Security PIN</h2><button className="close-button" onClick={resetAllModals}>&times;</button></div>
                        <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>अपना QR अपडेट PIN बदलने के लिए, कृपया अपना पुराना और नया PIN दर्ज करें।</p>
                        <div className="form-group"><div className="neu-input"><input type="password" id="oldPin" maxLength={4} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="oldPin">Old 4-digit PIN</label><div className="input-icon"><Lock/></div></div></div>
                        <div className="form-group"><div className="neu-input"><input type="password" id="pin" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="pin">New 4-digit PIN</label><div className="input-icon"><KeyRound/></div></div></div>
                        <div className="form-group"><div className="neu-input"><input type="password" id="confirmPin" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder=" " /><label htmlFor="confirmPin">Confirm New PIN</label><div className="input-icon"><KeyRound/></div></div></div>
                        {error && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
                        <button className={`neu-button ${isSavingPin ? 'loading' : ''}`} onClick={handleUpdatePin} disabled={isSavingPin}><span className="btn-text">Update PIN</span><div className="btn-loader"><div className="neu-spinner"></div></div></button>
                    </div>
                </div>
            )}

            {showForgotPinModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}}>
                        <div className="modal-header"><div className="neu-icon" style={{color: '#ff3b5c', margin: '0 15px 0 0', width: '60px', height: '60px'}}><HelpCircle size={30} /></div><h2 style={{fontSize: '1.5rem'}}>Forgot PIN?</h2><button className="close-button" onClick={resetAllModals}>&times;</button></div>
                        <p style={{color: '#6c7293', textAlign: 'center', lineHeight: 1.7, marginBottom: '20px'}}><strong>चेतावनी:</strong> कृपया बिना किसी ठोस कारण के कॉल करके परेशान न करें। यदि आप वास्तव में अपना PIN भूल गए हैं और QR कोड अपडेट करने में असमर्थ हैं, तभी हेल्पलाइन पर कॉल करें।</p>
                         <a href="tel:8302806913" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#00c896', color: 'white' }}>
                            <Phone size={20} /><span>Helpline पर कॉल करें</span>
                        </a>
                    </div>
                </div>
            )}
        </>
    );
}
