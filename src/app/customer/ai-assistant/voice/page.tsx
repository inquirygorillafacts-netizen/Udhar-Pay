'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, Shuffle, User, ArrowLeft } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';


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
    const router = useRouter();
    const [status, setStatus] = useState<Status>('idle');
    const [isAssistantOn, setIsAssistantOn] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setMessages(getHistory());
    }, []);

    useEffect(scrollToBottom, [messages]);

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
        setMessages(getHistory());
        
        try {
            const response = await askAiAssistant({
                query: text,
                history: getHistory(),
                generateAudio: true,
                voiceId: currentVoiceId,
            });

            addMessage({ sender: 'ai', text: response.text });
            setMessages(getHistory());


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
            setMessages(getHistory());
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
            const errorMessage = "माफ़ कीजिए, मैं आपकी बात नहीं सुन सका।";
            addMessage({sender: 'ai', text: errorMessage});
            setMessages(getHistory());
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
                         setIsAssistantOn(true); // If blocked, just start listening
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
        <main style={{ height: '100svh', position: 'relative', background: '#000000', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 10 }}>
                 <button onClick={() => router.back()} className="neu-button" style={{margin: 0, width: 'auto', padding: '10px 15px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}>
                    <ArrowLeft size={18}/>
                </button>
            </div>
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 10 }}>
                <button onClick={() => setIsTextModalOpen(true)} className="neu-button" style={{margin: 0, width: 'auto', padding: '10px 15px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}>
                    <MessageSquare size={18}/>
                </button>
                <button onClick={() => setCurrentVoiceIndex((prev) => (prev + 1) % availableVoices.length)} className="neu-button" style={{margin: 0, width: 'auto', padding: '10px 15px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}>
                    <Shuffle size={18}/>
                </button>
            </div>

            <header className="login-header" style={{flexShrink: 0, padding: '20px 0'}}>
                 <div className="neu-icon" style={{width: '300px', height: '300px', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: 'none', background: 'transparent'}}>
                     <video 
                        src="/1.mp4" 
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
                <h1 style={{color: 'white'}}>Voice Assistant</h1>
                <p style={{color: '#a0a0a0'}}>{getStatusText()}</p>
            </header>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    {messages.map((msg, index) => (
                      <div key={index} style={{display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '12px 18px',
                          background: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 200, 150, 0.15)',
                          color: 'white',
                          borderRadius: '20px',
                          border: `1px solid ${msg.sender === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0, 200, 150, 0.3)'}`,
                          maxWidth: '80%'
                        }}>
                          <p style={{ margin: 0, lineHeight: 1.5, fontSize: '15px', color: 'inherit' }}>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
