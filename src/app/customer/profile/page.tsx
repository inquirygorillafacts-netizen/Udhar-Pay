'use client';

import { useFirebase } from '@/firebase/client-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Camera, User, Phone, LogOut, Settings } from 'lucide-react';


interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  mobileNumber?: string;
}

export default function CustomerProfilePage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(firestore, 'customers', currentUser.uid);
        getDoc(userRef).then((docSnap) => {
          if (docSnap.exists()) {
            const profile = { uid: currentUser.uid, ...docSnap.data() } as UserProfile;
            setUserProfile(profile);
            setName(profile.displayName);
            setMobile(profile.mobileNumber || '');
            setPhotoPreview(profile.photoURL || null);
          }
          setLoading(false);
        });
      } else {
        router.replace('/customer/login');
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);

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
        const userRef = doc(firestore, 'customers', user.uid);
        // NOTE: Image uploading to a backend is not implemented yet.
        // For now, we only update name and mobile.
        
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
    <div className="login-container" style={{paddingTop: '40px', paddingBottom: '80px', minHeight: 'auto'}}>
      <div className="login-card" style={{ maxWidth: '500px', position: 'relative' }}>
        <button className="neu-button" disabled style={{ position: 'absolute', top: '25px', right: '25px', width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.5 }}>
          <Settings size={20} />
        </button>
      
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
          <div className="form-group"><div className="neu-input"><input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " required /><label htmlFor="name">Full Name</label><div className="input-icon"><User /></div></div></div>
          <div className="form-group"><div className="neu-input"><input type="tel" id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder=" " /><label htmlFor="mobile">Mobile Number</label><div className="input-icon"><Phone /></div></div></div>
          <button type="submit" className={`neu-button ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
            <span className="btn-text">Save Profile Changes</span>
            <div className="btn-loader"><div className="neu-spinner"></div></div>
          </button>
        </form>

        <div style={{marginTop: '30px'}}>
            <button className="neu-button sign-out-btn" onClick={handleSignOut} style={{width: '100%', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><LogOut size={20}/><span>Sign Out</span></button>
        </div>
      </div>
    </div>
  );
}
