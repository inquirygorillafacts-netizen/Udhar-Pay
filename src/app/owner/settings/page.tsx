'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { LogOut, Lock, ShieldOff, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  pinEnabled?: boolean;
  pin?: string;
}

interface Notification {
    type: 'success' | 'error';
    message: string;
}

export default function OwnerSettingsPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings fields
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(firestore, 'owners', currentUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const profile = { uid: currentUser.uid, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);
          setIsPinEnabled(profile.pinEnabled || false);
        }
        setLoading(false);

      } else {
        router.replace('/login/owner');
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);

  const handlePinToggle = () => {
    if (isPinEnabled) {
        setShowDisablePinModal(true);
    } else {
        setIsChangingPin(false);
        setPin('');
        setConfirmPin('');
        setPinError('');
        setShowPinModal(true);
    }
  };
  
  const handleDisablePin = async () => {
    if (!user) return;
    setIsSavingPin(true);
    try {
        const userRef = doc(firestore, 'owners', user.uid);
        await updateDoc(userRef, { pinEnabled: false, pin: "" });
        setIsPinEnabled(false);
        setShowDisablePinModal(false);
        setNotification({ type: 'success', message: 'PIN lock has been disabled.' });
    } catch(err) {
        setNotification({ type: 'error', message: 'Failed to disable PIN. Please try again.' });
    } finally {
        setIsSavingPin(false);
    }
  }

  const handleOpenChangePin = () => {
    setShowDisablePinModal(false);
    setIsChangingPin(true);
    setPin(''); // old pin
    setConfirmPin(''); // new pin
    setPinError('');
    setShowPinModal(true);
  }

  const handleSetOrChangePin = async () => {
      if (isChangingPin) {
          const currentPin = userProfile?.pin;
          if (pin !== currentPin) {
              setPinError("Old PIN is incorrect.");
              return;
          }
          if (confirmPin.length !== 4 || !/^\d{4}$/.test(confirmPin)) {
              setPinError("New PIN must be 4 digits.");
              return;
          }
      } else {
          if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
              setPinError("PIN must be 4 digits.");
              return;
          }
          if (pin !== confirmPin) {
              setPinError("PINs do not match.");
              return;
          }
      }

      setIsSavingPin(true);
      setPinError('');
      
      try {
          if (!user) throw new Error("User not found");
          const userRef = doc(firestore, 'owners', user.uid);
          const newPin = isChangingPin ? confirmPin : pin;
          await updateDoc(userRef, { pin: newPin, pinEnabled: true });
          setIsPinEnabled(true);
setShowPinModal(false);
          setPin('');
          setConfirmPin('');
          setNotification({ type: 'success', message: isChangingPin ? "PIN has been changed successfully!" : "PIN has been set successfully!" });
          setUserProfile(prev => prev ? {...prev, pin: newPin, pinEnabled: true} : null);
      } catch (err) {
          setPinError("Failed to save PIN. Please try again.");
      } finally {
          setIsSavingPin(false);
      }
  }

  const handleSignOut = async () => {
    await auth.signOut();
    localStorage.removeItem('activeRole');
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="neu-spinner"></div>
      </div>
    );
  }

  return (
    <>
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
    <div className="login-container" style={{paddingTop: '40px', paddingBottom: '80px', minHeight: 'auto'}}>
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <div className="login-header">
          <h2>Owner Settings</h2>
          <p>Manage application security and roles.</p>
        </div>
        
        <div className="setting-section">
            <h3 className="setting-title">Security</h3>
            <div className="neu-input" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '20px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><Lock size={20} style={{color: '#6c7293'}} /><span>Enable Login PIN</span></div>
                <div className={`neu-toggle-switch ${isPinEnabled ? 'active' : ''}`} onClick={handlePinToggle}><div className="neu-toggle-handle"></div></div>
            </div>
        </div>

        <div className="setting-section" style={{marginTop: '40px'}}>
          <h3 className="setting-title">Account</h3>
          <button className="neu-button sign-out-btn" onClick={handleSignOut} style={{width: '100%', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><LogOut size={20}/><span>Sign Out</span></button>
        </div>
      </div>
    </div>
    
      {showPinModal && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '420px'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <h2>{isChangingPin ? 'Change Your PIN' : 'Set Your 4-Digit PIN'}</h2>
                  <button className="close-button" onClick={() => setShowPinModal(false)}>&times;</button>
              </div>
              <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>
                  {isChangingPin ? 'Enter your old PIN, then your new PIN.' : 'This PIN will be used for secure login.'}
              </p>
              
              <div className="form-group">
                <div className="neu-input">
                    <input type="password" id="pin" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder=" " />
                    <label htmlFor="pin">{isChangingPin ? 'Old 4-digit PIN' : 'Enter 4-digit PIN'}</label>
                    <div className="input-icon"><Lock/></div>
                </div>
              </div>
              
              <div className="form-group">
                <div className="neu-input">
                    <input type="password" id="confirmPin" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder=" " />
                    <label htmlFor="confirmPin">{isChangingPin ? 'New 4-digit PIN' : 'Confirm PIN'}</label>
                    <div className="input-icon"><KeyRound/></div>
                </div>
              </div>
              
              {pinError && <p style={{ color: '#ff3b5c', textAlign: 'center', marginBottom: '15px' }}>{pinError}</p>}
              <button className={`neu-button ${isSavingPin ? 'loading' : ''}`} onClick={handleSetOrChangePin} disabled={isSavingPin}>
                <span className="btn-text">{isChangingPin ? 'Change PIN' : 'Save PIN'}</span><div className="btn-loader"><div className="neu-spinner"></div></div>
              </button>
          </div>
        </div>
      )}

      {showDisablePinModal && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '420px'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <h2>Disable PIN Lock?</h2>
                  <button className="close-button" onClick={() => setShowDisablePinModal(false)}>&times;</button>
              </div>
              <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '30px'}}>Are you sure you want to disable your PIN? This will remove the extra security layer for owner login.</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <button className={`neu-button ${isSavingPin ? 'loading' : ''}`} onClick={handleDisablePin} disabled={isSavingPin} style={{background: '#ff3b5c', color: 'white', margin: 0, display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center'}}>
                    <ShieldOff size={20}/>
                    <span className="btn-text">Yes, Disable PIN</span>
                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                </button>
                <button className="neu-button" onClick={handleOpenChangePin} style={{margin: 0, display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center'}}>
                    <KeyRound size={20} />
                    <span>Change PIN Instead</span>
                </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
