'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, Bot, Volume2, MessageSquare, Waves, Shuffle } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';

type Status = 'greeting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'off';

const availableVoices = [
    { voiceId: 'it-IT-lorenzo', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'hi-IN-kabir', style: 'General' },
    { voiceId: 'en-UK-hazel', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'de-DE-josephine', style: 'Conversational', multiNativeLocale: 'hi-IN' },
];

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const [status, setStatus] = useState<Status>('greeting');
    const [isAssistantOn, setIsAssistantOn] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [showIntroVideo, setShowIntroVideo] = useState(true);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const effectRan = useRef(false);

    const currentVoiceId = availableVoices[currentVoiceIndex].voiceId;

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
            audioRef.current.play();
            setStatus('speaking');

            audioRef.current.onended = () => {
                // After speaking, automatically start listening again if the assistant is on
                if(isAssistantOn) {
                    startListening();
                } else {
                    setStatus('idle');
                }
            };
            audioRef.current.onerror = (e) => {
                console.error("Error playing AI response audio.", e);
                // If there's an error, go back to listening
                 if(isAssistantOn) {
                    startListening();
                } else {
                    setStatus('idle');
                }
            }
          } else {
             // If no audio, go back to listening
             if(isAssistantOn) {
                startListening();
            } else {
                setStatus('idle');
            }
          }
        } catch (error) {
          console.error('Error with AI Assistant:', error);
          setAiResponse("माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।");
          // If there's an error, go back to listening
          if(isAssistantOn) {
            startListening();
          } else {
            setStatus('idle');
          }
        }
    }, [currentVoiceId, isAssistantOn]);
    
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setStatus('off');
    }

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            alert("माफ़ कीजिए, आपका ब्राउज़र वॉइस रिकग्निशन का समर्थन नहीं करता है।");
            setStatus('off');
            setIsAssistantOn(false);
            return;
        }
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
    
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN';
    
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
           if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
            setAiResponse("माफ़ कीजिए, मैं आपकी बात नहीं सुन सका। कृपया फिर प्रयास करें।");
          }
          // If there's an error (like no speech), just go back to listening
          if (isAssistantOn) {
            startListening();
          } else {
            setStatus('idle');
          }
        };
    
        recognition.onend = () => {
          recognitionRef.current = null;
          // Don't automatically go to idle. The flow is now controlled by onended/onerror.
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    }, [processQuery, isAssistantOn]);


    const playGreetingAndListen = useCallback(() => {
        setStatus('greeting');
        const greetingAudio = new Audio("/jarvis.mp3");
        audioRef.current = greetingAudio;
        
        greetingAudio.play().catch(e => {
            console.error("Greeting audio blocked by browser. Starting to listen directly.", e);
            // If audio fails, directly go to idle, ready for user to turn on.
            setStatus('off');
        });

        greetingAudio.onended = () => {
            // After greeting, just be ready. Don't start listening.
            setStatus('off');
        };
    }, []);

    useEffect(() => {
        if (effectRan.current === false) {
            const hasSeenIntro = localStorage.getItem('hasSeenAiIntro');
            if (hasSeenIntro) {
                setShowIntroVideo(false);
                playGreetingAndListen();
            } else {
                setShowIntroVideo(true);
            }
        }
        
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            effectRan.current = true;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playGreetingAndListen]);


    const handleAIToggle = () => {
        const newIsOn = !isAssistantOn;
        setIsAssistantOn(newIsOn);
        if (newIsOn) {
            startListening();
        } else {
            stopListening();
        }
    }

    const handleVideoEnd = () => {
        localStorage.setItem('hasSeenAiIntro', 'true');
        setShowIntroVideo(false);
        playGreetingAndListen();
    };

    const handleVoiceSwitch = () => {
        setCurrentVoiceIndex((prevIndex) => (prevIndex + 1) % availableVoices.length);
    };
    
    const getStatusIcon = () => {
        switch (status) {
            case 'listening': return <Waves size={24} className="text-blue-500" />;
            case 'thinking': return <Loader size={24} className="animate-spin" />;
            case 'speaking': return <Volume2 size={24} className="text-green-500" />;
            case 'greeting': return <Bot size={24} className="animate-pulse" />;
            case 'off': return <Bot size={24} className="text-red-500" />;
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
                    <p>{isAssistantOn ? "Jarvis is listening..." : "Assistant is off"}</p>
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

                <div className="setting-section" style={{marginBottom: '30px'}}>
                    <div className="neu-input" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}><Bot size={20} style={{color: '#6c7293'}} /><span>AI Assistant</span></div>
                        <div 
                            className={`neu-toggle-switch ${isAssistantOn ? 'active' : ''}`} 
                            onClick={handleAIToggle}
                        >
                            <div className="neu-toggle-handle"></div>
                        </div>
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
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
