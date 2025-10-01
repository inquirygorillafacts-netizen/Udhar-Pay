'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mic } from 'lucide-react';

export default function AiAssistantPage() {
    const [status, setStatus] = useState('OFFLINE');
    const [isListening, setIsListening] = useState(false);

    const handleMicClick = () => {
        // This logic will be expanded in the future to handle real voice recognition.
        setIsListening(prev => !prev);
        setStatus(prev => prev === 'OFFLINE' ? 'LISTENING...' : 'OFFLINE');
    };

    return (
        <main className="login-container">
            <div className="login-card" style={{maxWidth: '500px'}}>
                <header className="login-header">
                     <div className="neu-icon" style={{width: '100px', height: '100px', position: 'relative', overflow: 'visible'}}>
                        <Image 
                            src="/jarvis.gif" 
                            alt="AI Assistant Animation" 
                            layout="fill"
                            objectFit="cover"
                            className="ai-gif"
                            style={{borderRadius: '50%'}}
                            unoptimized={true} // GIF animations don't need Next.js optimization
                        />
                    </div>
                    <h1>AI Assistant</h1>
                    <p>Your personal guide for Udhar Pay</p>
                </header>

                <div style={{textAlign: 'center', marginBottom: '40px'}}>
                    <div 
                        id="status-text" 
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
                            transition: 'all 0.3s ease-in-out'
                        }}
                    >
                        <Mic size={36} />
                    </button>
                </div>
            </div>
        </main>
    );
}
