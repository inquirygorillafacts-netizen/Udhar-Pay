'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, Bot, Volume2, MessageSquare, Waves, Shuffle } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const availableVoices = [
    { voiceId: 'it-IT-lorenzo', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'hi-IN-kabir', style: 'General' },
    { voiceId: 'en-UK-hazel', style: 'Conversational', multiNativeLocale: 'hi_IN' },
    { voiceId: 'de-DE-josephine', style: 'Conversational', multiNativeLocale: 'hi-IN' },
];

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const [status, setStatus] = useState<Status>('idle');
    const [isAssistantOn, setIsAssistantOn] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const currentVoiceId = availableVoices[currentVoiceIndex].voiceId;
    
    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }

    const processQuery = useCallback(async (text: string) => {
        setStatus('thinking');
        stopAudio();
        
        addMessage({ sender: 'user', text });
        const history = getHistory();

        try {
            const response = await askAiAssistant({
                query: text,
                history,
                generateAudio: true,
                voiceId: currentVoiceId,
            });
            addMessage({ sender: 'ai', text: response.text });
            setAiResponse(response.text);


            if (response.audio && audioRef.current) {
                audioRef.current.src = response.audio;
                audioRef.current.play();
                setStatus('speaking');

                audioRef.current.onended = () => {
                    if (isAssistantOn) {
                        setStatus('listening'); 
                    } else {
                        setStatus('idle');
                    }
                };
            } else {
                 if (isAssistantOn) {
                    setStatus('listening');
                } else {
                    setStatus('idle');
                }
            }
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            const errorMessage = "माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।";
            addMessage({sender: 'ai', text: errorMessage});
            setAiResponse(errorMessage);
             if (isAssistantOn) {
                setStatus('listening');
            } else {
                setStatus('idle');
            }
        }
    }, [currentVoiceId, isAssistantOn]);

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            alert("माफ़ कीजिए, आपका ब्राउज़र वॉइस रिकग्निशन का समर्थन नहीं करता है।");
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onstart = () => {
            setStatus('listening');
        };

        recognition.onresult = (event: any) => {
             // If the AI is speaking, interrupt it
            if (status === 'speaking') {
                stopAudio();
                setStatus('listening');
            }

            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }

            let finalTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            const transcript = finalTranscript.trim();
            if (transcript) {
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isAssistantOn) {
                       processQuery(transcript);
                    }
                }, 2000); 
            }
        };
        
        recognition.onend = () => {
            if (isAssistantOn) {
                try {
                   if (recognitionRef.current) recognitionRef.current.start();
                } catch(e) {
                    console.log("Could not restart recognition, it might have been stopped manually.");
                }
            } else {
                setStatus('idle');
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            setAiResponse("माफ़ कीजिए, मैं आपकी बात नहीं सुन सका।");
            setStatus('idle');
        };
        
        try {
            recognition.start();
        } catch (e) {
             console.error("Could not start recognition: ", e);
        }
        recognitionRef.current = recognition;
    }, [isAssistantOn, processQuery, status]); 


    // Initialize and play greeting audio, then auto-start the assistant
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio("/jarvis.mp3");
        }

        const playGreetingAndListen = () => {
             if (audioRef.current) {
                audioRef.current.play().then(() => {
                    // When greeting ends, turn on the assistant and start listening
                    audioRef.current!.onended = () => {
                        setIsAssistantOn(true); 
                    };
                }).catch(e => {
                    if (e.name === 'NotAllowedError') {
                        console.log("Greeting audio blocked by browser. User needs to toggle AI on manually.");
                    }
                });
            }
        };

        playGreetingAndListen();

        // Cleanup function to stop everything when the component unmounts
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null;
            }
             if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to start/stop listening when the assistant is toggled on/off
    useEffect(() => {
        if (isAssistantOn) {
            startListening();
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.abort(); 
            }
            stopAudio();
            setStatus('idle');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAssistantOn, startListening]);

    const handleAIToggle = () => {
        setIsAssistantOn(prev => !prev);
    };
    
    const handleVoiceSwitch = () => {
        setCurrentVoiceIndex((prevIndex) => (prevIndex + 1) % availableVoices.length);
    };
    
    const getStatusIcon = () => {
        switch (status) {
            case 'listening': return <Waves size={24} className="text-blue-500" />;
            case 'thinking': return <Loader size={24} className="animate-spin" />;
            case 'speaking': return <Volume2 size={24} className="text-green-500" />;
            case 'idle':
            default:
                if (isAssistantOn) return <Bot size={24} className="animate-pulse" />;
                return <Bot size={24} className="text-red-500" />;
        }
    };

    const getStatusText = () => {
        if (!isAssistantOn) return "असिस्टेंट बंद है";
        switch (status) {
            case 'listening': return "मैं सुन रहा हूँ...";
            case 'thinking': return "सोच रहा हूँ...";
            case 'speaking': return "बोल रहा हूँ...";
            case 'idle': return "चालू करने के लिए तैयार";
            default: return "असिस्टेंट बंद है";
        }
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
                     <div className="neu-icon" style={{width: '100px', height: '100px', position: 'relative', overflow: 'hidden'}}>
                         <video 
                            src="/2.mp4" 
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover' 
                            }}
                          />
                    </div>
                    <h1>Voice Assistant</h1>
                    <p>{getStatusText()}</p>
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
                        <span>{isAssistantOn ? status : "Off"}</span>
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
