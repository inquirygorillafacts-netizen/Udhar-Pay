'use client';

import { useRouter } from 'next/navigation';
import { BookUser, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function IntroPage1() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/intro/2');
  };

  return (
    <main>
      <div className="login-container" style={{ justifyContent: 'flex-end', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        
        {/* Image/Graphic */}
        <div className="login-card" style={{ padding: '20px', borderRadius: '50%', boxShadow: 'none', background: 'transparent' }}>
           <Image src="/logo.png" alt="Udhar Pay Logo" width={300} height={300} style={{ borderRadius: '30px' }} />
        </div>
        
        {/* Content Card */}
        <div className="login-card" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="login-header" style={{ marginBottom: '2rem' }}>
            <div className="neu-icon" style={{width: '70px', height: '70px'}}>
              <div className="icon-inner"><BookUser /></div>
            </div>
            <h2 style={{ fontSize: '1.75rem' }}>दुकानदारी का नया हिसाब</h2>
            <p style={{ color: '#6c7293', maxWidth: '300px', margin: 'auto' }}>
              कागज़ी बही-खाते को कहें अलविदा! अब अपने सभी ग्राहकों का उधार और लेन-देन आसानी से अपने फ़ोन पर मैनेज करें।
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{width: '10px', height: '10px', background: '#00c896', borderRadius: '50%'}}></span>
            <span style={{width: '10px', height: '10px', background: '#d1d9e6', borderRadius: '50%'}}></span>
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
