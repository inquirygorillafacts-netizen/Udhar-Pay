'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, Bot, Volume2, MessageSquare, Waves, Shuffle } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

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
    const [status, setStatus] = useState<Status>('idle');
    const [isAssistantOn, setIsAssistantOn] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const currentVoiceId = availableVoices[currentVoiceIndex].voiceId;

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            alert("माफ़ कीजिए, आपका ब्राउज़र वॉइस रिकग्निशन का समर्थन नहीं करता है।");
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop(); // Stop any existing instance
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Key change: listen continuously
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        let final_transcript = '';

        recognition.onstart = () => {
            setStatus('listening');
        };

        recognition.onresult = (event: any) => {
            let interim_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            // Once we have a final result, stop the recognition to process it
            if (final_transcript.trim()) {
                recognition.stop();
            }
        };
        
        recognition.onend = () => {
            if (isAssistantOn && final_transcript.trim()) {
                processQuery(final_transcript);
            } else if (isAssistantOn) {
                // If it ended without a final transcript (e.g., no-speech timeout), restart.
                try {
                   if(recognitionRef.current) recognitionRef.current.start();
                } catch(e) {
                    console.error("Could not restart recognition: ", e);
                }
            }
        };

        recognition.onerror = (event: any) => {
            // Ignore common, non-critical errors
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            setAiResponse("माफ़ कीजिए, मैं आपकी बात नहीं सुन सका।");
            setStatus('idle');
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    }, [isAssistantOn]); // Removed processQuery from dependencies as it's defined below

     const processQuery = useCallback(async (text: string) => {
        setStatus('thinking');
        try {
            const response = await askAiAssistant({
                query: text,
                generateAudio: true,
                voiceId: currentVoiceId,
            });
            setAiResponse(response.text);

            if (response.audio && audioRef.current) {
                audioRef.current.src = response.audio;
                audioRef.current.play();
                setStatus('speaking');

                // This is the key for the continuous loop
                audioRef.current.onended = () => {
                    if (isAssistantOn) {
                        setStatus('listening');
                        startListening();
                    } else {
                        setStatus('idle');
                    }
                };
            } else {
                 // If no audio, immediately start listening again if assistant is on
                 if (isAssistantOn) {
                    setStatus('listening');
                    startListening();
                } else {
                    setStatus('idle');
                }
            }
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            setAiResponse("माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।");
             if (isAssistantOn) {
                startListening();
            } else {
                setStatus('idle');
            }
        }
    }, [currentVoiceId, isAssistantOn, startListening]);
    
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
                        startListening();       
                    };
                }).catch(e => {
                    if (e.name === 'NotAllowedError') {
                        console.log("Greeting audio blocked by browser. User needs to toggle AI on manually.");
                        // If autoplay fails, we don't start listening. User must toggle the switch.
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
        }
    }, [startListening]); // Only run once on mount

    const handleAIToggle = () => {
        const newIsOn = !isAssistantOn;
        setIsAssistantOn(newIsOn);

        if (newIsOn) {
            startListening();
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.abort(); 
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setStatus('idle');
        }
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
                     <div className="neu-icon" style={{width: '100px', height: '100px', position: 'relative'}}>
                        <div className="icon-inner" style={{width: '50px', height: '50px'}}>🤖</div>
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
