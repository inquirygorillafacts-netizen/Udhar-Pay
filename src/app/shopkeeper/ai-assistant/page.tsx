'use client';

import Image from 'next/image';
import { Mic, Loader, Bot, Volume2 } from 'lucide-react';
import useAiAssistant from '@/hooks/use-ai-assistant';

export default function ShopkeeperAiAssistantPage() {
    const { status, isListening, startListening, stopListening } = useAiAssistant();

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'listening':
                return <Mic size={24} className="text-red-500 animate-pulse" />;
            case 'thinking':
                return <Loader size={24} className="animate-spin" />;
            case 'speaking':
                 return <Volume2 size={24} className="text-green-500" />;
            case 'idle':
            default:
                return <Bot size={24} />;
        }
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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff'
                        }}
                    >
                        {getStatusIcon()}
                        <span>{status}</span>
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
