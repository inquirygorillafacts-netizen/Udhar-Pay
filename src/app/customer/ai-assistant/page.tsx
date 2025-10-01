'use client';

import Image from 'next/image';
import { Mic, Loader, Bot, Volume2, MessageSquare, VolumeX, Send } from 'lucide-react';
import useAiAssistant from '@/hooks/use-ai-assistant';

export default function CustomerAiAssistantPage() {
    const { 
        status, 
        isListening, 
        startListening, 
        stopListening, 
        aiResponse, 
        mode, 
        toggleMode,
        inputText,
        setInputText,
        sendTextMessage,
    } = useAiAssistant();

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    
    const handleSendClick = (e: React.FormEvent) => {
        e.preventDefault();
        if(inputText.trim()) {
            sendTextMessage(inputText);
        }
    }

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
                    <h1>Customer AI Assistant</h1>
                    <p>How can I help you manage your credits and payments today?</p>
                </header>

                <div className="neu-input" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', marginBottom: '30px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#6c7293', fontWeight: 500}}>
                        {mode === 'voice' ? <Volume2 size={20} /> : <MessageSquare size={20} />}
                        <span>{mode === 'voice' ? 'Voice Mode' : 'Text Mode'}</span>
                    </div>
                    <div className={`neu-toggle-switch ${mode === 'voice' ? 'active' : ''}`} onClick={toggleMode}>
                        <div className="neu-toggle-handle"></div>
                    </div>
                </div>

                <div style={{textAlign: 'center', marginBottom: '30px'}}>
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
                
                 {aiResponse && (
                    <div style={{marginBottom: '30px', padding: '20px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff'}}>
                        <div style={{display: 'flex', alignItems: 'flex-start', gap: '15px'}}>
                             <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, flexShrink: 0, background: '#00c896'}}>
                                <MessageSquare size={20} color="white"/>
                             </div>
                             <p style={{color: '#3d4468', fontSize: '15px', lineHeight: 1.6, paddingTop: '5px'}}>{aiResponse}</p>
                        </div>
                    </div>
                 )}

                {mode === 'voice' ? (
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px'}}>
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
                ) : (
                    <form onSubmit={handleSendClick} style={{marginBottom: '10px'}}>
                         <div className="neu-input" style={{display: 'flex', alignItems: 'center'}}>
                            <div className="input-icon"><MessageSquare /></div>
                            <input
                                type="text"
                                placeholder="Type your message..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                style={{paddingLeft: '55px', fontSize: '1rem'}}
                                disabled={status === 'thinking'}
                            />
                            <button 
                                type="submit"
                                className={`neu-button ${status === 'thinking' ? 'loading' : ''}`} 
                                style={{width: 'auto', margin: '8px', padding: '10px 20px', flexShrink: 0, background: '#00c896', color: 'white'}}
                                disabled={status === 'thinking' || !inputText.trim()}
                                >
                                <span className="btn-text"><Send size={18}/></span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
