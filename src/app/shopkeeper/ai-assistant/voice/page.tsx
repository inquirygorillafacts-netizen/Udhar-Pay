'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Mic, Loader, Bot, Volume2, MessageSquare } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

// Polyfill for SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const [status, setStatus] = useState<Status>('idle');
    const [isListening, setIsListening] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const processQuery = useCallback(async (text: string) => {
        setStatus('thinking');
        setAiResponse('');
        try {
          const response = await askAiAssistant({ 
            query: text,
            generateAudio: true
          });
          
          setAiResponse(response.text);
    
          if (response.audio) {
            if (!audioRef.current) {
              audioRef.current = new Audio();
            }
            audioRef.current.src = response.audio;
            audioRef.current.oncanplaythrough = () => {
              audioRef.current?.play();
              setStatus('speaking');
            };
            audioRef.current.onended = () => {
              setStatus('idle');
            };
            audioRef.current.onerror = () => {
                console.error("Error playing audio.");
                setStatus('idle');
            }
          } else {
            setStatus('idle');
          }
        } catch (error) {
          console.error('Error with AI Assistant:', error);
          setAiResponse("Sorry, I encountered an error. Please try again.");
          setStatus('idle');
        }
      }, []);

      const stopListening = useCallback(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
        }
      }, []);

      const startListening = useCallback(() => {
        if (isListening || !SpeechRecognition) {
          if (!SpeechRecognition) {
              alert("Sorry, your browser does not support voice recognition.");
          }
          return;
        }
    
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
    
        recognition.onstart = () => {
          setIsListening(true);
          setStatus('listening');
          setAiResponse(''); // Clear previous response
        };
    
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            processQuery(transcript);
          }
        };
    
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setStatus('idle');
        };
    
        recognition.onend = () => {
          setIsListening(false);
          if (status === 'listening') {
            setStatus('idle');
          }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
      }, [isListening, processQuery, status]);

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

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if(recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
    }, []);

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
                    <h1>Voice Assistant</h1>
                    <p>Tap the mic and ask me anything!</p>
                </header>

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
            </div>
        </main>
    );
}
