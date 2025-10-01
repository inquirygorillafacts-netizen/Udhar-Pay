'use client';

import Image from 'next/image';
import { Mic } from 'lucide-react';
import { useState } from 'react';

export default function ShopkeeperAiAssistantPage() {
    const [status, setStatus] = useState('OFFLINE');
    const [isListening, setIsListening] = useState(false);

    const handleMicClick = () => {
        setIsListening(prev => !prev);
        setStatus(prev => prev === 'OFFLINE' ? 'LISTENING...' : 'OFFLINE');
    };

    return (
        <main className="login-container">
            <div className="login-card" style={{maxWidth: '500px'}}>
                <header className="login-header">
                     <div className="neu-icon" style={{width: '100px', height: '100px', position: 'relative'}}>
                        <Image 
                            src="/jarvis.gif" 
                            alt="AI Assistant Animation" 
                            layout="fill"
                            objectFit="cover"
                            style={{borderRadius: '50%'}}
                            unoptimized={true}
                        />
                    </div>
                    <h1>Shopkeeper AI Assistant</h1>
                    <p>How can I help you manage your business today?</p>
                </header>

                <div style={{textAlign: 'center', marginBottom: '40px'}}>
                    <div 
                        style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#6c7293',
                            background: '#e0e5ec',
                            padding: '10px 25px',
                            borderRadius: '25px',
                            display: 'inline-block',
                            boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff'
                        }}
                    >
                        {status}
                    </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'center'}}>
                    <button 
                        className={`neu-button ${isListening ? 'active' : ''}`}
                        onClick={handleMicClick}
                        aria-label="Toggle AI Assistant"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Mic size={36} />
                    </button>
                </div>
            </div>
        </main>
    );
}
