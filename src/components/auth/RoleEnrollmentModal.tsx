'use client';

import { useState, useRef, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateUniqueCustomerCode, generateUniqueShopkeeperCode } from '@/lib/code-helpers';
import { Camera, User, Phone, Store, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';


interface RoleEnrollmentModalProps {
    role: 'customer' | 'shopkeeper';
    onClose: () => void;
    onSuccess: () => void;
}

const IMGBB_API_KEY = '833aa7bc7188c4f8d99f63e06421bbad';

export default function RoleEnrollmentModal({ role, onClose, onSuccess }: RoleEnrollmentModalProps) {
    const { auth, firestore } = useFirebase();
    const [step, setStep] = useState(1);
    const [agreed, setAgreed] = useState(false);
    
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (auth.currentUser?.phoneNumber) {
            setMobile(auth.currentUser.phoneNumber);
        }
    }, [auth.currentUser]);


    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleNext = () => {
        if (step === 1 && !agreed) {
            setError("You must agree to the terms to continue.");
            return;
        }
        setError('');
        setStep(2);
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!photoFile) return null;

        const formData = new FormData();
        formData.append('image', photoFile);

        try {
            const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData);
            if (response.data && response.data.data && response.data.data.url) {
                return response.data.data.url;
            }
            return null;
        } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
            setError("Failed to upload image. Please try a different image or try again later.");
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!name || !mobile) {
            setError("Please fill in all the required fields.");
            return;
        }
        if (!auth.currentUser) {
            setError("Authentication error. Please sign in again.");
            return;
        }

        setIsProcessing(true);
        setError('');
        
        try {
            let photoURL = auth.currentUser.photoURL || null;
            if (photoFile) {
                const uploadedUrl = await uploadImage();
                if (uploadedUrl) {
                    photoURL = uploadedUrl;
                } else {
                    // Error is already set by uploadImage function
                    setIsProcessing(false);
                    return;
                }
            }

            const collectionName = `${role}s`;
            const docRef = doc(firestore, collectionName, auth.currentUser.uid);
            
            let data: any = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: name,
                mobileNumber: mobile,
                photoURL: photoURL,
                createdAt: serverTimestamp(),
                role: role,
                connections: [],
            };

            if (role === 'customer') {
                data.customerCode = await generateUniqueCustomerCode(firestore);
            } else {
                data.shopkeeperCode = await generateUniqueShopkeeperCode(firestore);
                 data.creditSettings = {};
                 data.defaultCreditLimit = 1000;
            }

            await setDoc(docRef, data);
            onSuccess();

        } catch (err) {
            console.error("Enrollment failed:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const roleText = role === 'customer' ? 'ग्राहक' : 'दुकानदार';
    const nameLabel = role === 'customer' ? 'पूरा नाम' : 'दुकान का नाम';
    const nameIcon = role === 'customer' ? <User /> : <Store />;
    const agreementText = role === 'customer'
        ? "क्या आप ग्राहक बनना चाहते हैं? अगर हाँ, तो आपको ग्राहक के तौर पर अपनी जानकारी देनी होगी और एक नया खाता बनाना होगा। क्या आप अपना ग्राहक खाता बनाने के लिए तैयार हैं?"
        : "क्या आप दुकानदार बनना चाहते हैं? अगर हाँ, तो आपको दुकानदार के तौर पर अपनी दुकान की जानकारी देनी होगी और एक नया खाता बनाना होगा। क्या आप अपना दुकानदार खाता बनाने के लिए तैयार हैं?";
    const photoUploadInstruction = role === 'customer'
        ? "अपना साफ़ चेहरे वाला फोटो अपलोड करें।"
        : "अपनी दुकान का साफ़ फोटो अपलोड करें।";

    return (
        <>
            <div className="modal-overlay">
                <div className="login-card modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>{roleText} के रूप में नामांकित करें</h2>
                        <button className="close-button" onClick={onClose}>&times;</button>
                    </div>

                    {step === 1 && (
                        <div>
                            <div style={{ padding: '15px 20px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', marginBottom: '30px' }}>
                                <p style={{ color: '#6c7293', margin: 0, fontSize: '14px', lineHeight: 1.7 }}>
                                {agreementText}
                                </p>
                            </div>
                            <div className="remember-wrapper" style={{marginBottom: '20px'}}>
                                <input type="checkbox" id="agree" checked={agreed} onChange={() => setAgreed(!agreed)}/>
                                <label htmlFor="agree" className="checkbox-label">
                                    <div className="neu-checkbox">
                                        <Check size={16} strokeWidth={3}/>
                                    </div>
                                    मैं एक नई {roleText} प्रोफाइल बनाने के लिए सहमत हूँ।
                                </label>
                            </div>
                            {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                            <button className="neu-button" onClick={handleNext} disabled={!agreed} style={{marginTop: '10px'}}>
                                आगे बढ़ें <ArrowRight size={20} style={{display: 'inline', marginLeft: '8px'}}/>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div className="form-group">
                                <div className="neu-input">
                                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder=" " />
                                    <label htmlFor="name">{nameLabel}</label>
                                    <div className="input-icon">{nameIcon}</div>
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="neu-input">
                                    <input 
                                        type="tel" 
                                        id="mobile" 
                                        value={mobile} 
                                        onChange={(e) => setMobile(e.target.value)} 
                                        required 
                                        placeholder=" " 
                                        disabled={!!auth.currentUser?.phoneNumber}
                                    />
                                    <label htmlFor="mobile">मोबाइल नंबर</label>
                                    <div className="input-icon"><Phone /></div>
                                </div>
                            </div>
                            
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{textAlign: 'center'}}>
                                    <p style={{ color: '#6c7293', fontSize: '12px', marginBottom: '10px', fontWeight: 500 }}>{photoUploadInstruction}</p>
                                    <div className="neu-icon" style={{ position: 'relative', width: '100px', height: '100px', margin: 'auto', overflow: 'visible' }}>
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="icon-inner" style={{width: '60px', height: '60px'}}><User/></div>
                                        )}
                                        <button className="neu-button" style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderRadius: '50%', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
                                            <Camera size={14}/>
                                        </button>
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
                                    </div>
                                </div>
                                {photoPreview && (
                                    <div style={{ flex: 1, padding: '15px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 4px 4px 8px #d1e7dd, inset -4px -4px 8px #ffffff' }}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#008a5c'}}>
                                            <AlertTriangle size={24} />
                                            <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 600}}>ध्यान दें!</h4>
                                        </div>
                                        <p style={{ color: '#008a5c', margin: '10px 0 0 0', fontSize: '13px', lineHeight: 1.6 }}>
                                            आप इस फोटो को बाद में सिर्फ एक बार ही बदल पाएँगे। गलत फोटो के कारण आपका अकाउंट रिजेक्ट हो सकता है, इसलिए कृपया सही फोटो ही अपलोड करें।
                                        </p>
                                    </div>
                                )}
                            </div>

                            {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                            
                            <button type="submit" className={`neu-button ${isProcessing ? 'loading' : ''}`} disabled={isProcessing} onClick={handleSubmit} style={{marginTop: '30px'}}>
                                <span className="btn-text">{roleText} प्रोफाइल बनाएं</span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
