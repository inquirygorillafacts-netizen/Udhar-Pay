'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mic } from 'lucide-react';
import './ai.css';

export default function AiAssistantPage() {
    const [status, setStatus] = useState('OFFLINE');
    const [isListening, setIsListening] = useState(false);

    const handleMicClick = () => {
        // This logic will be expanded in the future to handle real voice recognition.
        setIsListening(prev => !prev);
        setStatus(prev => prev === 'OFFLINE' ? 'LISTENING...' : 'OFFLINE');
    };

    return (
        <main className="ai-container">
            <div className="login-card ai-card">
                <header className="ai-header">
                    <h1>AI Assistant</h1>
                    <p>Your personal guide for Udhar Pay</p>
                </header>

                <div className="ai-face">
                    <div className="ai-gif-wrapper">
                         <Image 
                            src="/jarvis.gif" 
                            alt="AI Assistant Animation" 
                            width={280}
                            height={280}
                            className="ai-gif"
                            unoptimized={true} // GIF animations don't need Next.js optimization
                        />
                    </div>
                    <div id="status-text" className="ai-status-text">{status}</div>
                </div>

                <div className="ai-controls">
                    <button 
                        className={`neu-button ai-mic-button ${isListening ? 'listening' : ''}`}
                        onClick={handleMicClick}
                        aria-label="Toggle AI Assistant"
                    >
                        <Mic size={36} />
                    </button>
                </div>
            </div>
        </main>
    );
}
