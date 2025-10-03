'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Camera, User, Phone, LogOut, Settings, Lock, ShieldOff, KeyRound, Store, CheckCircle, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import RoleEnrollmentModal from '@/components/auth/RoleEnrollmentModal';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  mobileNumber?: string;
  pinEnabled?: boolean;
  pin?: string;
  shopkeeperCode?: string;
}

export default function ShopkeeperProfilePage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Role management states
  const [roles, setRoles] = useState({ customer: false, shopkeeper: false });
  const [isCheckingRoles, setIsCheckingRoles] = useState(true);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentRole, setEnrollmentRole] = useState<'customer' | 'shopkeeper' | null>(null);


  // Profile fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Settings fields
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(firestore, 'shopkeepers', currentUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const profile = { uid: currentUser.uid, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);
          setName(profile.displayName || '');
          setMobile(profile.mobileNumber || '');
          setPhotoPreview(profile.photoURL || null);
          setIsPinEnabled(profile.pinEnabled || false);
        }
        setLoading(false);

        // Check roles
        setIsCheckingRoles(true);
        const ownerDoc = await getDoc(doc(firestore, 'owners', currentUser.uid));
        if (ownerDoc.exists()) {
            setRoles({ customer: false, shopkeeper: false }); // Owners can't be other roles
        } else {
            const customerDoc = await getDoc(doc(firestore, 'customers', currentUser.uid));
            const shopkeeperDoc = await getDoc(doc(firestore, 'shopkeepers', currentUser.uid));
            setRoles({
              customer: customerDoc.exists(),
              shopkeeper: shopkeeperDoc.exists()
            });
        }
        setIsCheckingRoles(false);

      } else {
        router.replace('/login/shopkeeper');
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);

  const handleRoleSwitch = (newRole: 'customer' | 'shopkeeper') => {
      if (!user) return;

      if (!roles[newRole]) {
        setEnrollmentRole(newRole);
        setShowEnrollmentModal(true);
      } else {
        localStorage.setItem('activeRole', newRole);
        router.push(`/${newRole}/dashboard`);
      }
  };

  const handleEnrollmentSuccess = (newRole: 'customer' | 'shopkeeper') => {
    setRoles(prev => ({...prev, [newRole]: true}));
    setShowEnrollmentModal(false);
    localStorage.setItem('activeRole', newRole);
    router.push(`/${newRole}/dashboard`);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    try {
        const userRef = doc(firestore, 'shopkeepers', user.uid);
        // NOTE: Image uploading to a backend is not implemented yet.
        
        await updateProfile(user, { displayName: name });
        await updateDoc(userRef, { displayName: name, mobileNumber: mobile });
        
        setUserProfile(prev => prev ? { ...prev, displayName: name, mobileNumber: mobile } : null);
        
        alert('Profile updated successfully!');

    } catch (error) {
        console.error("Error updating profile: ", error);
        alert('Failed to update profile. Please try again.');
    } finally {
        setIsSaving(false);
    }
  }
  
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
        const userRef = doc(firestore, 'shopkeepers', user.uid);
        await updateDoc(userRef, { pinEnabled: false, pin: "" });
        setIsPinEnabled(false);
        setShowDisablePinModal(false);
        alert("PIN lock has been disabled.");
    } catch(err) {
        alert("Failed to disable PIN. Please try again.");
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
          const userRef = doc(firestore, 'shopkeepers', user.uid);
          const newPin = isChangingPin ? confirmPin : pin;
          await updateDoc(userRef, { pin: newPin, pinEnabled: true });
          setIsPinEnabled(true);
          setShowPinModal(false);
          setPin('');
          setConfirmPin('');
          alert(isChangingPin ? "PIN has been changed successfully!" : "PIN has been set successfully!");
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

  const activeRole = typeof window !== 'undefined' ? localStorage.getItem('activeRole') : 'shopkeeper';

  return (
    <>
    {showEnrollmentModal && enrollmentRole && (
        <RoleEnrollmentModal 
            role={enrollmentRole}
            onClose={() => setShowEnrollmentModal(false)}
            onSuccess={() => handleEnrollmentSuccess(enrollmentRole)}
        />
    )}
    <div className="login-container" style={{paddingTop: '40px', paddingBottom: '80px', minHeight: 'auto'}}>
      <div className="login-card" style={{ maxWidth: '500px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '25px', right: '25px', display: 'flex', gap: '10px' }}>
            <button className="neu-button" onClick={() => setShowSettingsModal(true)} style={{ width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} />
            </button>
          </div>
      
        <div className="login-header" style={{ marginTop: '0px', marginBottom: '40px' }}>
          <div className="neu-icon" style={{ position: 'relative', width: '100px', height: '100px', overflow: 'visible' }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="icon-inner" style={{width: '60px', height: '60px'}}><User/></div>
            )}
            <button className="neu-button" style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderRadius: '50%', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
              <Camera size={14}/>
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
          </div>
          <h2>Edit Profile</h2>
        </div>

        <form className="login-form" noValidate onSubmit={handleSaveChanges}>
          <div className="form-group"><div className="neu-input"><input type="text" id="name" value={name || ''} onChange={(e) => setName(e.target.value)} placeholder=" " required /><label htmlFor="name">Shop Name</label><div className="input-icon"><User /></div></div></div>
          <div className="form-group"><div className="neu-input"><input type="tel" id="mobile" value={mobile || ''} onChange={(e) => setMobile(e.target.value)} placeholder=" " /><label htmlFor="mobile">Mobile Number</label><div className="input-icon"><Phone /></div></div></div>
          <button type="submit" className={`neu-button ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
            <span className="btn-text">Save Profile Changes</span>
            <div className="btn-loader"><div className="neu-spinner"></div></div>
          </button>
        </form>

        <div className="setting-section" style={{marginTop: '40px'}}>
              <h3 className="setting-title" style={{textAlign: 'center'}}>Manage Roles</h3>
               {isCheckingRoles ? <div className="neu-spinner" style={{margin: '20px auto'}}></div> : (
                  <div style={{display: 'flex', gap: '20px', justifyContent: 'center'}}>
                      {/* Customer Role Card */}
                      <div className={`neu-button ${activeRole === 'customer' ? 'active' : ''}`} style={{flex: 1, flexDirection: 'column', height: 'auto', padding: '20px', margin: 0, border: roles.customer ? '2px solid #00c896' : '2px solid transparent'}}>
                          <User size={30} style={{marginBottom: '10px'}}/>
                          <h4 style={{fontSize: '1rem', fontWeight: 600}}>Customer</h4>
                           {activeRole === 'customer' && <CheckCircle size={20} style={{color: 'white', marginTop: '10px'}} />}
                           {!roles.customer && <p style={{fontSize: '0.7rem', color: '#9499b7', marginTop: '5px'}}>Not Enrolled</p>}
                          {roles.customer && activeRole !== 'customer' && (
                            <button onClick={() => handleRoleSwitch('customer')} className="neu-button" style={{fontSize: '0.8rem', padding: '8px 12px', width: '100%', marginTop: '15px', marginBottom: 0}}>Switch</button>
                          )}
                          {!roles.customer && (
                            <button onClick={() => handleRoleSwitch('customer')} className="neu-button" style={{fontSize: '0.8rem', padding: '8px 12px', width: '100%', marginTop: '15px', marginBottom: 0}}>Enroll & Switch</button>
                          )}
                      </div>
                      {/* Shopkeeper Role Card */}
                       <div className={`neu-button ${activeRole === 'shopkeeper' ? 'active' : ''}`} style={{flex: 1, flexDirection: 'column', height: 'auto', padding: '20px', margin: 0, border: roles.shopkeeper ? '2px solid #00c896' : '2px solid transparent', opacity: roles.shopkeeper ? 1 : 0.6, pointerEvents: roles.shopkeeper ? 'auto' : 'none' }}>
                          <Store size={30} style={{marginBottom: '10px'}}/>
                          <h4 style={{fontSize: '1rem', fontWeight: 600}}>Shopkeeper</h4>
                           {activeRole === 'shopkeeper' && <CheckCircle size={20} style={{color: 'white', marginTop: '10px'}} />}
                          {activeRole !== 'shopkeeper' && (
                            <button onClick={() => handleRoleSwitch('shopkeeper')} className="neu-button" style={{fontSize: '0.8rem', padding: '8px 12px', width: '100%', marginTop: '15px', marginBottom: 0}}>Activate</button>
                          )}
                      </div>
                  </div>
              )}
          </div>

        <div style={{marginTop: '30px'}}>
            <button className="neu-button sign-out-btn" onClick={handleSignOut} style={{width: '100%', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><LogOut size={20}/><span>Sign Out</span></button>
        </div>
      </div>
    </div>
    
    {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
            <div className="login-card modal-content" style={{maxWidth: '480px'}} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Settings</h2>
                  <button className="close-button" onClick={() => setShowSettingsModal(false)}>&times;</button>
                </div>

                <div className="setting-section">
                    <h3 className="setting-title">Shop Management</h3>
                    <Link href="/shopkeeper/control-room" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><SlidersHorizontal size={20} /><span>दुकान कंट्रोल रूम</span></div>
                        <span>&rarr;</span>
                    </Link>
                </div>

                <div className="setting-section">
                    <h3 className="setting-title">Support</h3>
                    <Link href="/shopkeeper/helpline" className="neu-button" style={{margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><Phone size={20} /><span>Helpline</span></div>
                        <span>&rarr;</span>
                    </Link>
                </div>
                
                <div className="setting-section">
                    <h3 className="setting-title">Security</h3>
                    <div className="neu-input" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><Lock size={20} style={{color: '#6c7293'}} /><span>Enable PIN Lock</span></div>
                        <div className={`neu-toggle-switch ${isPinEnabled ? 'active' : ''}`} onClick={handlePinToggle}><div className="neu-toggle-handle"></div></div>
                    </div>
                </div>

                 <button className="neu-button" onClick={() => setShowSettingsModal(false)} style={{margin: '30px 0 0 0', width: '100%'}}>
                    Close
                </button>
            </div>
        </div>
      )}

      {showPinModal && (
        <div className="modal-overlay">
          <div className="login-card modal-content" style={{maxWidth: '420px'}} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                  <h2>{isChangingPin ? 'Change Your PIN' : 'Set Your 4-Digit PIN'}</h2>
                  <button className="close-button" onClick={() => setShowPinModal(false)}>&times;</button>
              </div>
              <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '20px'}}>
                  {isChangingPin ? 'Enter your old PIN, then your new PIN.' : 'This PIN will be used to unlock the app.'}
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
              <p style={{color: '#9499b7', textAlign: 'center', marginBottom: '30px'}}>Are you sure you want to disable your PIN? This will turn off the app lock security.</p>
              
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
