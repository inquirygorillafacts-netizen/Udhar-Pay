'use client';

import { Phone, Mail, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
)

export default function HelplinePage() {
    const router = useRouter();

    return (
        <div className="login-container">
            <div style={{width: '100%', maxWidth: '600px', position: 'relative'}}>
                 <button 
                    onClick={() => router.back()} 
                    className="neu-button" 
                    style={{ position: 'absolute', top: '20px', right: '20px', width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                >
                    <X size={20} />
                </button>

                <div className="login-card" style={{ textAlign: 'center' }}>
                    
                    <div className="login-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                        <div className="neu-icon" style={{width: '70px', height: '70px', margin: 0, flexShrink: 0}}>
                            <Image src="/logo.png" alt="Udhar Pay Logo" width={70} height={70} style={{objectFit: 'cover', borderRadius: '50%'}} />
                        </div>
                        <div style={{textAlign: 'left'}}>
                            <h1 style={{color: '#3d4468', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Udhar Pay Helpline</h1>
                            <p style={{color: '#9499b7', fontSize: '15px', margin: 0}}>24/7 Support Available</p>
                        </div>
                    </div>


                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                        <div style={{display: 'flex', flexDirection: 'row', gap: '20px'}}>
                            <a href="tel:8302806913" className="neu-button" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: 1 }}>
                                <Phone size={20} style={{ color: '#00c896' }} />
                                <span>Call</span>
                            </a>
                            <a href="https://wa.me/918302806913" target="_blank" rel="noopener noreferrer" className="neu-button" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: 1 }}>
                                <div style={{color: '#00c896'}}><WhatsAppIcon /></div>
                                <span>WhatsApp</span>
                            </a>
                        </div>
                        <a href="mailto:inquiry.yogendrayogi@gmail.com" className="neu-button" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: 1 }}>
                            <Mail size={20} style={{ color: '#00c896' }} />
                            <span>Email</span>
                        </a>
                    </div>
                </div>

                <div className="login-card" style={{ textAlign: 'center', marginTop: '40px' }}>
                     <div className="login-header" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                        <div className="neu-icon" style={{width: '70px', height: '70px', margin: 0, flexShrink: 0}}>
                           <Image src="/logo.png" alt="Udhar Pay Logo" width={70} height={70} style={{objectFit: 'cover', borderRadius: '50%'}} />
                        </div>
                        <div style={{textAlign: 'left'}}>
                            <h1 style={{color: '#3d4468', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Business Owner</h1>
                            <p style={{color: '#9499b7', fontSize: '15px', margin: 0}}>For Critical Issues Only</p>
                        </div>
                    </div>
                     <div style={{ padding: '15px 20px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', marginBottom: '30px' }}>
                        <p style={{ color: '#6c7293', margin: 0, textAlign: 'center', fontSize: '14px', width: '100%' }}>
                           <strong>चेतावनी:</strong> केवल आपात स्थिति में या यदि अन्य हेल्पलाइन जवाब नहीं दे रही हैं, तभी कॉल करें। अनावश्यक कॉल करने पर आपका नंबर बैन कर दिया जाएगा।
                        </p>
                    </div>
                    <a href="tel:7073077195" className="neu-button" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: 1, background: '#ff3b5c', color: 'white' }}>
                        <Phone size={20} />
                        <span>Call बिजनस ऑनर</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
