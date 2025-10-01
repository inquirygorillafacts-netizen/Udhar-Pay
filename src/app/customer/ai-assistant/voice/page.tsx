'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Loader, Bot, Volume2, MessageSquare, Waves } from 'lucide-react';
import { askAiAssistant, generateGreetingAudio } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';

type Status = 'greeting' | 'idle' | 'listening' | 'thinking' | 'speaking';

// Polyfill for SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const [status, setStatus] = useState<Status>('greeting');
    const [aiResponse, setAiResponse] = useState('');
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hasGreetedRef = useRef(false);

    const startListening = useCallback(() => {
        if (!SpeechRecognition || recognitionRef.current) {
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
          setStatus('listening');
          setAiResponse('');
        };
    
        recognition.onresult = (event: any) => {
          recognitionRef.current = null;
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            processQuery(transcript);
          }
        };
    
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
             setAiResponse("Sorry, I didn't catch that. Please try again.");
          }
          setStatus('idle');
          recognitionRef.current = null;
        };
    
        recognition.onend = () => {
          if (status === 'listening') {
             setStatus('idle');
          }
           recognitionRef.current = null;
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    }, [status]); // Dependency on status to avoid stale closures

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
            if (!audioRef.current) audioRef.current = new Audio();
            
            audioRef.current.src = response.audio;
            audioRef.current.oncanplaythrough = () => {
              audioRef.current?.play();
              setStatus('speaking');
            };
            audioRef.current.onended = () => {
                setStatus('idle');
                // Optional: Automatically start listening again after AI finishes speaking
                // startListening(); 
            };
            audioRef.current.onerror = (e) => {
                console.error("Error playing audio.", e);
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

    const playGreeting = useCallback(async () => {
        try {
            const response = await generateGreetingAudio();
            if (response.audio) {
                if (!audioRef.current) audioRef.current = new Audio();
                
                audioRef.current.src = response.audio;
                audioRef.current.oncanplaythrough = () => {
                    audioRef.current?.play();
                    setStatus('speaking');
                };
                audioRef.current.onended = () => {
                    setStatus('idle');
                    startListening(); // Automatically start listening after greeting
                };
                 audioRef.current.onerror = (e) => {
                    console.error("Error playing greeting audio.", e);
                    setStatus('idle');
                    startListening(); // Still try to listen
                }
            } else {
                 startListening(); // If no audio, just start listening
            }
        } catch (error) {
            console.error("Failed to generate greeting:", error);
            startListening(); // Fallback to listening
        }
    }, [startListening]);

    useEffect(() => {
        if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            playGreeting();
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
            if(recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        }
    }, [playGreeting]);
    
    const getStatusIcon = () => {
        switch (status) {
            case 'listening': return <Waves size={24} className="text-blue-500" />;
            case 'thinking': return <Loader size={24} className="animate-spin" />;
            case 'speaking': return <Volume2 size={24} className="text-green-500" />;
            case 'greeting': return <Bot size={24} className="animate-pulse" />;
            case 'idle':
            default: return <Bot size={24} />;
        }
    };

    return (
      <>
        <main className="login-container" style={{ position: 'relative' }}>
             <button onClick={() => setIsTextModalOpen(true)} className="neu-button" style={{ position: 'absolute', top: '25px', right: '25px', width: 'auto', height: 'auto', padding: '12px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <MessageSquare size={20} />
                <span className='hidden sm:inline'>Text Mode</span>
            </button>
            <div className="login-card" style={{maxWidth: '500px'}}>
                <header className="login-header">
                     <div className="neu-icon" style={{width: '100px', height: '100px', position: 'relative'}}>
                        <div className="icon-inner" style={{width: '50px', height: '50px'}}>🤖</div>
                    </div>
                    <h1>Voice Assistant</h1>
                    <p>I'm listening...</p>
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

                 <div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px', minHeight: '80px'}}>
                    {/* The microphone button is removed for automatic operation */}
                </div>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
