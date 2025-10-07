
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, Settings, ArrowLeft, Mic, Ear, BrainCircuit, X, MicOff, PlayCircle } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';
import './ai.css';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'uninitialized';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const router = useRouter();
    const [status, setStatus] = useState<Status>('uninitialized');
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const isProcessingQuery = useRef(false);

    // Timeout ref for no-speech detection
    const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
        };
        // Load voices initially and on change
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);
    
    const stopAudio = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const startListening = useCallback(() => {
        if (!SpeechRecognition || !hasPermission || isMuted || status === 'listening' || status === 'uninitialized') {
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                // Status is set in onstart
            } catch (e) {
                // This can happen if recognition is already starting, which is fine.
            }
        }
    }, [hasPermission, isMuted, status]);

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error("Browser does not support speech synthesis.");
            setStatus('idle');
            isProcessingQuery.current = false;
            return;
        }
        
        stopAudio();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const hindiVoice = voicesRef.current.find(voice => voice.lang === 'hi-IN');
        if (hindiVoice) {
            utterance.voice = hindiVoice;
        } else {
            console.warn("Hindi (hi-IN) voice not found. Using default.");
        }
        utterance.lang = 'hi-IN';
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => {
            setStatus('speaking');
        };

        utterance.onend = () => {
            setStatus('idle');
            isProcessingQuery.current = false;
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            setStatus('idle');
            isProcessingQuery.current = false;
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopAudio]);
    
    const processQuery = useCallback(async (text: string) => {
        if (isProcessingQuery.current || !text) return;
        isProcessingQuery.current = true;
        
        setStatus('thinking');
        stopAudio();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }


        addMessage({ sender: 'user', text });
        setMessages(getHistory());
        
        try {
            const response = await askAiAssistant({
                query: text,
                history: getHistory(),
            });

            addMessage({ sender: 'ai', text: response.text });
            setMessages(getHistory());
            speak(response.text);
            
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            const errorMessage = "माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।";
            addMessage({sender: 'ai', text: errorMessage});
            setMessages(getHistory());
            speak(errorMessage);
        }
    }, [stopAudio, speak]);


    const initializeAssistant = async () => {
        if (!SpeechRecognition || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            setHasPermission(false);
            setStatus('idle');
            return;
        }
        
        // This is a workaround for some browsers that require a user gesture to start speech synthesis.
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const silentUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silentUtterance);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'hi-IN';
            
            let finalTranscript = '';

            recognition.onresult = (event: any) => {
                if (speechTimeoutRef.current) {
                    clearTimeout(speechTimeoutRef.current);
                }
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                // If we have a final transcript, process it.
                if (finalTranscript.trim()) {
                    processQuery(finalTranscript.trim());
                    finalTranscript = '';
                }

                // If the user pauses for 1.5s, consider it the end of input
                speechTimeoutRef.current = setTimeout(() => {
                    if (interimTranscript.trim() && !isProcessingQuery.current) {
                       processQuery(interimTranscript.trim());
                    }
                }, 1500);
            };
            
            recognition.onstart = () => {
                setStatus('listening');
                isProcessingQuery.current = false;
            };

            recognition.onend = () => {
                 if (speechTimeoutRef.current) {
                    clearTimeout(speechTimeoutRef.current);
                }
                // Only go to idle if not in the middle of processing a query.
                if (!isProcessingQuery.current) {
                    setStatus('idle');
                }
            };
            recognition.onerror = (event: any) => {
                if (event.error === 'not-allowed') {
                    setHasPermission(false);
                    addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it in your browser settings to use the voice assistant." });
                    setMessages(getHistory());
                } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Speech recognition error:', event.error);
                }
                isProcessingQuery.current = false;
                setStatus('idle');
            };
            recognitionRef.current = recognition;
            
            setStatus('idle'); // Move to idle to trigger the listening useEffect

        } catch (err) {
            console.error('Microphone permission denied.', err);
            setHasPermission(false);
            setStatus('idle');
            addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it in your browser settings to use the voice assistant." });
            setMessages(getHistory());
        }
    };
    
    useEffect(() => {
        if(status === 'idle' && !isProcessingQuery.current && !isMuted && recognitionRef.current) {
            startListening();
        }
    }, [status, isMuted, startListening]);


    useEffect(() => {
        setMessages(getHistory());
    }, []);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    
    const handleMuteToggle = () => {
        if (status === 'speaking') {
            stopAudio(); // This also triggers onend which sets status to 'idle'
            // The useEffect for 'idle' will then call startListening()
            return;
        }

        const nextMuteState = !isMuted;
        setIsMuted(nextMuteState);
        
        if (nextMuteState) {
            if (recognitionRef.current) recognitionRef.current.stop();
            stopAudio();
            isProcessingQuery.current = false;
            setStatus('idle');
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudio();
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
             if (speechTimeoutRef.current) {
                clearTimeout(speechTimeoutRef.current);
            }
        }
    }, [stopAudio]);

    const statusInfo = {
        uninitialized: { text: "Tap to Start", icon: <PlayCircle size={16}/> },
        idle: { text: isMuted ? "Muted" : "Idle", icon: isMuted ? <MicOff size={16}/> : <Mic size={16}/> },
        listening: { text: "Listening...", icon: <Ear size={16}/> },
        thinking: { text: "Thinking...", icon: <BrainCircuit size={16}/> },
        speaking: { text: "Speaking...", icon: <Bot size={16}/> },
    };
    
    return (
      <>
        <main className="ai-container">
             <div className="ai-header">
                <button onClick={() => router.back()} className="glass-button">
                    <ArrowLeft size={20}/>
                </button>
                 <div className="status-indicator">
                    {statusInfo[status].icon}
                    <span>{statusInfo[status].text}</span>
                </div>
            </div>
            
             <div className="ai-video-container">
                 <div className="ai-video-wrapper">
                    <video 
                        src="/ai.mp4" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="ai-video-orb"
                    />
                     {status === 'uninitialized' && (
                        <div style={{position: 'absolute', zIndex: 10}}>
                             <button onClick={initializeAssistant} className="glass-button" style={{padding: '2rem', borderRadius: '50%', background: 'rgba(0,200,150,0.7)', border: 'none'}}>
                                <PlayCircle size={50} color="white"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="ai-chat-area">
                <div className="ai-chat-messages">
                      {messages.map((msg, index) => (
                      <div key={index} className={`chat-bubble-wrapper ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                        <div className="chat-bubble">
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="ai-control-panel">
                <button className="glass-button" disabled>
                    <Settings size={18}/>
                </button>
                <button onClick={handleMuteToggle} className={`glass-button ${isMuted || status === 'speaking' ? 'active' : ''}`} disabled={status === 'uninitialized'}>
                    {isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
                </button>
                <button onClick={() => setIsTextModalOpen(true)} className="glass-button" disabled={status === 'uninitialized'}>
                    <MessageSquare size={18}/>
                </button>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
