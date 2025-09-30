
'use client';

import { useRouter } from 'next/navigation';
import { LifeBuoy, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';

export default function IntroPage3() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const handleGetStarted = () => {
    // Set the flag in localStorage to indicate that the user has completed the onboarding.
    localStorage.setItem('hasSeenOnboarding', 'true');
    // Navigate to the authentication page.
    router.replace('/auth');
  };

  const toggleMute = () => {
    if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
        if(!videoRef.current.muted) {
            videoRef.current.currentTime = 0; // Restart video with sound
            videoRef.current.play();
        }
    }
  }

  return (
    <main>
       <div className="login-container" style={{ justifyContent: 'flex-end', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        
        {/* Video Player */}
        <div 
          className="login-card" 
          style={{ 
            padding: '0', 
            width: '320px', 
            height: '320px', 
            borderRadius: '50%', 
            boxShadow: '20px 20px 60px #bec3cf, -20px -20px 60px #ffffff', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
           <video 
            ref={videoRef}
            src="/help.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }}
          />
          <button onClick={toggleMute} className="neu-button" style={{ position: 'absolute', bottom: '15px', right: '15px', width: '45px', height: '45px', borderRadius: '50%', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
        
        {/* Content Card */}
        <div className="login-card" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="login-header" style={{ marginBottom: '2rem' }}>
            <div className="neu-icon" style={{width: '70px', height: '70px'}}>
              <div className="icon-inner"><LifeBuoy /></div>
            </div>
            <h2 style={{ fontSize: '1.75rem' }}>24/7 सहायता, हमेशा आपके साथ</h2>
            <p style={{ color: '#6c7293', maxWidth: '300px', margin: 'auto' }}>
              कोई भी समस्या हो? हमारी टीम आपकी मदद के लिए हमेशा तैयार है। कॉल, व्हाट्सएप, या ईमेल करें - हम हर पल आपके साथ हैं।
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{width: '10px', height: '10px', background: '#d1d9e6', borderRadius: '50%'}}></span>
            <span style={{width: '10px', height: '10px', background: '#d1d9e6', borderRadius: '50%'}}></span>
            <span style={{width: '10px', height: '10px', background: '#00c896', borderRadius: '50%'}}></span>
          </div>

          <button onClick={handleGetStarted} className="neu-button" style={{ background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 'auto' }}>
            शुरू करें <CheckCircle size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
