'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, ArrowLeft, Mic, Ear, BrainCircuit, X, MicOff, PlayCircle, Languages } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';
import './ai.css';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'uninitialized';
type Language = 'english' | 'hindi';

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
    const [language, setLanguage] = useState<Language>('english');
    
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const isProcessingQuery = useRef(false);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const loadVoices = useCallback(() => {
        voicesRef.current = window.speechSynthesis.getVoices();
    }, []);

    useEffect(() => {
        const preferredLang = localStorage.getItem('aiLanguage') as Language | null;
        if (preferredLang) {
            setLanguage(preferredLang);
        }

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, [loadVoices]);
    
    const shutdownAssistant = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.abort(); // Use abort to immediately stop
            recognitionRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        stopAudio();
        setStatus('uninitialized');
        isProcessingQuery.current = false;
    }, []);

    const stopAudio = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const toggleLanguage = () => {
        const newLang = language === 'english' ? 'hindi' : 'english';
        setLanguage(newLang);
        localStorage.setItem('aiLanguage', newLang);
        stopAudio();
        if (recognitionRef.current) {
            // Abort current recognition and let the `onend` handler restart it naturally
            recognitionRef.current.abort();
        } else {
             // If not running, just set to idle to allow re-initialization
            setStatus('idle');
        }
    };
    
    const speak = useCallback((text: string, onEndCallback?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error("Browser does not support speech synthesis.");
            setStatus('idle');
            isProcessingQuery.current = false;
            onEndCallback?.();
            return;
        }
        
        stopAudio();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voiceLang = language === 'hindi' ? 'hi-IN' : 'en-US';
        const selectedVoice = voicesRef.current.find(voice => voice.lang.startsWith(voiceLang));
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        } else {
            console.warn(`${voiceLang} voice not found. Using default.`);
        }
        utterance.lang = voiceLang;
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => {
             if (recognitionRef.current) recognitionRef.current.stop();
            setStatus('speaking');
        }
        utterance.onend = () => {
            if (onEndCallback) {
                onEndCallback();
            } else {
                setStatus('idle');
                isProcessingQuery.current = false;
            }
        };
        utterance.onerror = (event) => {
            if (event.error !== 'interrupted') {
               console.error("Speech synthesis error:", event.error);
            }
            if (onEndCallback) {
                onEndCallback();
            } else {
                setStatus('idle');
                isProcessingQuery.current = false;
            }
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopAudio, language]);

    const handleSilence = useCallback(() => {
        speak("माफ़ करना, आप अगर बात-चीत नहीं करना चाहते हो तो मुझे जाना होगा।", () => {
            shutdownAssistant();
        });
    }, [speak, shutdownAssistant]);

    const processQuery = useCallback(async (text: string) => {
        if (isProcessingQuery.current || !text) return;
        
        isProcessingQuery.current = true;
        setStatus('thinking');
        
        addMessage({ sender: 'user', text });
        setMessages(getHistory());
        
        try {
            const response = await askAiAssistant({
                query: text,
                history: getHistory(),
                language: language
            });

            addMessage({ sender: 'ai', text: response.text });
            setMessages(getHistory());
            speak(response.text);
            
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            const errorMessage = language === 'hindi' ? "माफ़ कीजिए, कोई त्रुटि हुई।" : "Sorry, an error occurred.";
            addMessage({sender: 'ai', text: errorMessage});
            setMessages(getHistory());
            speak(errorMessage);
        }
    }, [speak, language]);

    const startListening = useCallback(() => {
        if (!SpeechRecognition || !hasPermission || isMuted || status === 'speaking' || isProcessingQuery.current) {
            return;
        }
        if (recognitionRef.current) {
            try {
                if (status !== 'listening') {
                   recognitionRef.current.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
                   recognitionRef.current.start();
                }
            } catch (e) {
                console.error("Could not start recognition (might already be running):", e);
            }
        }
    }, [hasPermission, isMuted, status, language]);

    const initializeAssistant = useCallback(async () => {
        if (!SpeechRecognition || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            setHasPermission(false);
            setStatus('idle');
            return;
        }
        
        stopAudio();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript.trim() && !isProcessingQuery.current) {
                     processQuery(finalTranscript.trim());
                }
            };
            
            recognition.onstart = () => {
                setStatus('listening');
            };

            recognition.onend = () => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                if (!isProcessingQuery.current && status !== 'uninitialized' && status !== 'speaking') {
                    setStatus('idle');
                }
            };

            recognition.onerror = (event: any) => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                if (event.error === 'not-allowed') {
                    setHasPermission(false);
                    addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it to use the voice assistant." });
                } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Speech recognition error:', event.error);
                }
                 if (!isProcessingQuery.current) {
                    setStatus('idle');
                }
            };
            recognitionRef.current = recognition;
            
            setStatus('idle');

        } catch (err) {
            console.error('Microphone permission denied.', err);
            setHasPermission(false);
            setStatus('idle');
            addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it in your browser settings to use the voice assistant." });
            setMessages(getHistory());
        }
    }, [processQuery, stopAudio]);
    
    useEffect(() => {
        if(status === 'idle' && !isMuted) {
            startListening();
        }
         if (status === 'listening') {
            silenceTimerRef.current = setTimeout(handleSilence, 15000);
        } else {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        }
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
    }, [status, isMuted, startListening, handleSilence]);

    useEffect(() => {
        setMessages(getHistory());
    }, []);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleMuteToggle = () => {
        if (status === 'speaking') {
            stopAudio();
            setStatus('idle');
            isProcessingQuery.current = false;
            return;
        }
        const nextMuteState = !isMuted;
        setIsMuted(nextMuteState);
        if (nextMuteState && recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    useEffect(() => {
        return () => {
            shutdownAssistant();
        }
    }, [shutdownAssistant]);
    
    return (
      <>
        <main className="ai-container">
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
                             <button onClick={initializeAssistant} className="glass-button" style={{width: '100px', height: '100px', background: 'rgba(0,200,150,0.7)', border: 'none'}}>
                                <PlayCircle size={50}/>
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
                 <button onClick={() => router.back()} className="glass-button">
                    <ArrowLeft size={20}/>
                </button>
                <button onClick={toggleLanguage} className="glass-button" disabled={status === 'uninitialized'}>
                    <Languages size={18}/>
                </button>
                 <button onClick={handleMuteToggle} className={`glass-button mic-button ${isMuted || status === 'speaking' ? 'active' : ''}`} disabled={status === 'uninitialized'}>
                    {status === 'speaking' ? <X size={24}/> : isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
                </button>
                <button onClick={() => setIsTextModalOpen(true)} className="glass-button" disabled={status === 'uninitialized'}>
                    <MessageSquare size={18}/>
                </button>
                 <div className="status-indicator">
                    {status === 'listening' ? <Ear size={16}/> : status === 'thinking' ? <BrainCircuit size={16}/> : status === 'speaking' ? <Bot size={16}/> : <Mic size={16}/>}
                    <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
