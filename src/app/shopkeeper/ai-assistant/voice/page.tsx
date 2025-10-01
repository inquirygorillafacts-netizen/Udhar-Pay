'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, Bot, Volume2, MessageSquare, Waves, Shuffle } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';

type Status = 'greeting' | 'idle' | 'listening' | 'thinking' | 'speaking';

const availableVoices = [
    { voiceId: 'it-IT-lorenzo', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'hi-IN-kabir', style: 'General' },
    { voiceId: 'en-UK-hazel', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'de-DE-josephine', style: 'Conversational', multiNativeLocale: 'hi-IN' },
];

// Polyfill for SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const [status, setStatus] = useState<Status>('greeting');
    const [aiResponse, setAiResponse] = useState('');
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [showIntroVideo, setShowIntroVideo] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const currentVoiceId = availableVoices[currentVoiceIndex].voiceId;

     useEffect(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenAiIntro');
        if (hasSeenIntro !== 'true') {
            setShowIntroVideo(true);
        }
    }, []);

    const handleVideoEnd = () => {
        localStorage.setItem('hasSeenAiIntro', 'true');
        setShowIntroVideo(false);
    };

    const handleVoiceSwitch = () => {
        setCurrentVoiceIndex((prevIndex) => (prevIndex + 1) % availableVoices.length);
    };

    const processQuery = useCallback(async (text: string) => {
        setStatus('thinking');
        setAiResponse('');
        try {
          const response = await askAiAssistant({ 
            query: text,
            generateAudio: true,
            voiceId: currentVoiceId,
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
    }, [currentVoiceId]);

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
          alert("Sorry, your browser does not support voice recognition.");
          return;
        }
         if (recognitionRef.current) {
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
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            processQuery(transcript);
          }
        };
    
        recognition.onerror = (event: any) => {
          if (event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
               setAiResponse("Sorry, I didn't catch that. Please try again.");
            }
          }
          recognitionRef.current = null;
          setStatus('idle');
        };
    
        recognition.onend = () => {
           recognitionRef.current = null;
           // Check the status before setting to idle to avoid race conditions.
           setStatus(currentStatus => currentStatus === 'listening' ? 'idle' : currentStatus);
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    }, [processQuery]);

    useEffect(() => {
        if (showIntroVideo) {
            return;
        }

        const currentAudio = new Audio("/jarvis.mp3");
        audioRef.current = currentAudio;

        const playGreeting = () => {
             setStatus('speaking');
             currentAudio.play().catch(e => {
                // This error is expected if the user hasn't interacted with the page yet.
                // We'll just start listening instead.
                if ((e as Error).name === 'NotAllowedError') {
                    console.log("Greeting audio blocked by browser. Starting to listen directly.");
                } else {
                    console.error("Error playing greeting audio.", e);
                }
                setStatus('idle');
                startListening();
            });
        }
        
        playGreeting();

        const handleAudioEnd = () => {
            setStatus('idle');
            startListening();
        };

        currentAudio.addEventListener('ended', handleAudioEnd);

        return () => {
            currentAudio.removeEventListener('ended', handleAudioEnd);
            if (!currentAudio.paused) {
                currentAudio.pause();
            }
             if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        }
    }, [showIntroVideo, startListening]);
    
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
    
    if (showIntroVideo) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'black', zIndex: 9999 }}>
                <video
                    src="/jarvis.mp4"
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnd}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>
        );
    }

    return (
      <>
        <main className="login-container" style={{ position: 'relative' }}>
             <button onClick={() => setIsTextModalOpen(true)} className="neu-button" style={{ position: 'absolute', top: '25px', right: '25px', width: 'auto', height: 'auto', padding: '12px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <MessageSquare size={20} />
                 <span className='hidden sm:inline'>Text Mode</span>
            </button>
             <button onClick={handleVoiceSwitch} className="neu-button" style={{ position: 'absolute', top: '25px', left: '25px', width: 'auto', height: 'auto', padding: '12px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Shuffle size={20} />
                <span className='hidden sm:inline'>Switch Voice</span>
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
