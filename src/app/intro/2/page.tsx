
'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function IntroPage2() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/intro/3');
  };
  
  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/auth');
  }

  return (
    <main>
       <div className="login-container" style={{ justifyContent: 'flex-end', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        
        {/* Top Skip Button */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button 
            onClick={handleSkip} 
            className="neu-button" 
            style={{ width: 'auto', padding: '10px 20px', margin: 0, fontSize: '14px', background: 'transparent', boxShadow: 'none' }}
          >
            Skip
          </button>
        </div>
        
        {/* Video Player */}
        <div 
          className="login-card" 
          style={{ 
            padding: '0', 
            width: '300px', 
            height: '300px', 
            borderRadius: '50%', 
            boxShadow: '20px 20px 60px #bec3cf, -20px -20px 60px #ffffff', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
           <video 
            src="/video.mp4" 
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
        </div>
        
        {/* Content Card */}
        <div className="login-card" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="login-header" style={{ marginBottom: '2rem' }}>
            <div className="neu-icon" style={{width: '70px', height: '70px'}}>
              <div className="icon-inner"><ShieldCheck /></div>
            </div>
            <h2 style={{ fontSize: '1.75rem' }}>सुरक्षित और भरोसेमंद</h2>
            <p style={{ color: '#6c7293', maxWidth: '300px', margin: 'auto' }}>
              आपके सभी लेन-देन पूरी तरह से सुरक्षित हैं। कहीं से भी भुगतान करें और हिसाब-किताब पर तुरंत नज़र रखें।
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{width: '10px', height: '10px', background: '#d1d9e6', borderRadius: '50%'}}></span>
            <span style={{width: '10px', height: '10px', background: '#00c896', borderRadius: '50%'}}></span>
            <span style={{width: '10px', height: '10px', background: '#d1d9e6', borderRadius: '50%'}}></span>
          </div>

          <button onClick={handleNext} className="neu-button" style={{ background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 'auto' }}>
            आगे बढ़ें <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
