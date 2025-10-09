'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Store, Camera, KeyRound, ArrowRight, CheckCircle, UploadCloud } from 'lucide-react';
import axios from 'axios';

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '833aa7bc7188c4f8d99f63e06421bbad';

function OnboardingComponent() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') as 'customer' | 'shopkeeper';

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/auth');
    }
  }, [auth, router]);

  const handleNextStep = async () => {
    setError('');
    setIsProcessing(true);

    try {
      if (step === 1) { // Process Name
        if (!name.trim()) {
          setError('कृपया अपना नाम दर्ज करें।');
          setIsProcessing(false);
          return;
        }
        await updateProfile(auth.currentUser!, { displayName: name });
        const collectionName = role === 'customer' ? 'customers' : 'shopkeepers';
        await updateDoc(doc(firestore, collectionName, auth.currentUser!.uid), { displayName: name });
        setStep(2);
      } else if (step === 2) { // Process Photo
        if (photoFile) {
          const formData = new FormData();
          formData.append('image', photoFile);
          const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData);
          const photoURL = response.data.data.url;
          
          await updateProfile(auth.currentUser!, { photoURL });
          const collectionName = role === 'customer' ? 'customers' : 'shopkeepers';
          await updateDoc(doc(firestore, collectionName, auth.currentUser!.uid), { photoURL });
        }
        setStep(3);
      } else if (step === 3) { // Process PIN
        if (pin) {
          if (pin.length !== 4) {
            setError('पिन 4 अंकों का होना चाहिए।');
            setIsProcessing(false);
            return;
          }
          if (pin !== confirmPin) {
            setError('पिन मेल नहीं खाते।');
            setIsProcessing(false);
            return;
          }
          const collectionName = role === 'customer' ? 'customers' : 'shopkeepers';
          await updateDoc(doc(firestore, collectionName, auth.currentUser!.uid), { pin, pinEnabled: true });
        }
        setStep(4); // Go to success step
        setTimeout(() => handleFinish(), 2000); // Redirect after 2s
      }
    } catch (e) {
      console.error("Onboarding step failed:", e);
      setError("एक त्रुटि हुई। कृपया पुन: प्रयास करें।");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    setError('');
    const nextStep = step + 1;
    if (nextStep > 3) {
      handleFinish();
    } else {
      setStep(nextStep);
    }
  };

  const handleFinish = () => {
    router.push(`/${role}/dashboard`);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="login-header">
              <div className="neu-icon"><div className="icon-inner">{role === 'customer' ? <User /> : <Store />}</div></div>
              <h2>{role === 'customer' ? 'आपका शुभ नाम क्या है?' : 'आपकी दुकान का क्या नाम है?'}</h2>
            </div>
            <div className="form-group">
              <div className="neu-input">
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder=" " autoFocus />
                <label htmlFor="name">{role === 'customer' ? 'आपका नाम' : 'दुकान का नाम'}</label>
              </div>
            </div>
            {error && <p className="error-message show">{error}</p>}
            <button onClick={handleNextStep} className={`neu-button ${isProcessing ? 'loading' : ''}`} disabled={isProcessing || !name.trim()}>
              <span className="btn-text">आगे बढ़ें</span>
              <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
          </>
        );
      case 2:
        return (
          <>
            <div className="login-header">
              <div className="neu-icon"><div className="icon-inner"><Camera /></div></div>
              <h2>एक फ़ोटो जोड़ें</h2>
              <p>{role === 'customer' ? 'अपनी प्रोफ़ाइल तस्वीर अपलोड करें।' : 'अपनी दुकान की एक तस्वीर अपलोड करें।'} (वैकल्पिक)</p>
            </div>
            <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div onClick={() => fileInputRef.current?.click()} className="neu-icon" style={{width: '150px', height: '150px', cursor: 'pointer'}}>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
                    {photoPreview ? <img src={photoPreview} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} /> : <UploadCloud size={50} />}
                </div>
            </div>
            {error && <p className="error-message show">{error}</p>}
             <button onClick={handleNextStep} className={`neu-button ${isProcessing ? 'loading' : ''}`} disabled={isProcessing}>
              <span className="btn-text">आगे बढ़ें</span>
              <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
          </>
        );
      case 3:
        return (
          <>
            <div className="login-header">
              <div className="neu-icon"><div className="icon-inner"><KeyRound /></div></div>
              <h2>एक सुरक्षा पिन सेट करें</h2>
              <p>एक 4-अंकीय पिन के साथ अपने ऐप को सुरक्षित करें। (वैकल्पिक)</p>
            </div>
            <div className="form-group">
                <div className="neu-input">
                    <input type="password" id="pin" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder=" " />
                    <label htmlFor="pin">4-अंकीय पिन दर्ज करें</label>
                </div>
            </div>
            <div className="form-group">
                <div className="neu-input">
                    <input type="password" id="confirmPin" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder=" " />
                    <label htmlFor="confirmPin">पिन की पुष्टि करें</label>
                </div>
            </div>
            {error && <p className="error-message show">{error}</p>}
             <button onClick={handleNextStep} className={`neu-button ${isProcessing ? 'loading' : ''}`} disabled={isProcessing}>
              <span className="btn-text">सेटअप समाप्त करें</span>
              <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
          </>
        );
        case 4:
            return (
                <div className="success-message show" style={{ animation: 'none', transform: 'none', opacity: 1}}>
                    <div className="neu-icon" style={{background: '#00c896', color: 'white'}}>
                       <CheckCircle size={40} strokeWidth={3} />
                    </div>
                    <h3>सेटअप पूरा हुआ!</h3>
                    <p>आप पूरी तरह तैयार हैं। आपको डैशबोर्ड पर भेजा जा रहा है...</p>
                </div>
            );
      default:
        return null;
    }
  };
  
  if (!role) {
      return (
        <div className="loading-container">
            <p>अमान्य ऑनबोर्डिंग सत्र। पुनः निर्देशित किया जा रहा है...</p>
        </div>
      )
  }

  return (
    <main className="login-container">
      <div className="login-card" style={{ maxWidth: '450px' }}>
        {step <= 3 && (
            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <button onClick={handleSkip} className="neu-button" style={{ width: 'auto', padding: '8px 16px', fontSize: '14px', margin: 0, boxShadow: 'none', background: 'transparent' }}>
                छोड़ें
              </button>
            </div>
        )}
        {renderStep()}
      </div>
    </main>
  );
}


export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="loading-container"><div className="neu-spinner"></div></div>}>
            <OnboardingComponent />
        </Suspense>
    )
}
