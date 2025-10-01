'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mic } from 'lucide-react';
import './ai.css';

export default function AiAssistantPage() {
    const [status, setStatus] = useState('OFFLINE');
    const [isListening, setIsListening] = useState(false);

    const handleMicClick = () => {
        // AI logic will go here in the future
        setIsListening(prev => !prev);
        setStatus(prev => prev === 'OFFLINE' ? 'LISTENING...' : 'OFFLINE');
    };

    return (
        <main className="ai-container">
            <div className="ai-card">
                <header className="ai-header">
                    <h1>AI Assistant</h1>
                    <p>Your personal guide for Udhar Pay</p>
                </header>

                <div className="ai-face">
                    <div className="ai-gif-wrapper">
                         <Image 
                            src="/jarvis.gif" 
                            alt="AI Assistant Animation" 
                            width={300}
                            height={300}
                            className="ai-gif"
                            unoptimized={true} // GIF animations don't need Next.js optimization
                        />
                    </div>
                    <div id="status-text" className="ai-status-text">{status}</div>
                </div>

                <div className="ai-controls">
                    <button 
                        className={`ai-mic-button ${isListening ? 'listening' : ''}`}
                        onClick={handleMicClick}
                        aria-label="Toggle AI Assistant"
                    >
                        <Mic size={32} />
                    </button>
                </div>
            </div>
        </main>
    );
}
