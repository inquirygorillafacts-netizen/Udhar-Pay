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
    const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    const stopAudio = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const toggleLanguage = () => {
        const newLang = language === 'english' ? 'hindi' : 'english';
        setLanguage(newLang);
        localStorage.setItem('aiLanguage', newLang);
        stopAudio();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setStatus('idle');
    };

    const startListening = useCallback(() => {
        if (!SpeechRecognition || !hasPermission || isMuted || status === 'listening' || status === 'uninitialized') {
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.lang = language === 'hindi' ? 'hi-IN' : 'en-US';
                recognitionRef.current.start();
            } catch (e) {
                // Ignore if already starting
            }
        }
    }, [hasPermission, isMuted, status, language]);

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error("Browser does not support speech synthesis.");
            setStatus('idle');
            isProcessingQuery.current = false;
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

        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => {
            setStatus('idle');
            isProcessingQuery.current = false;
        };
        utterance.onerror = (event) => {
            if (event.error !== 'interrupted') {
               console.error("Speech synthesis error:", event.error);
            }
            setStatus('idle');
            isProcessingQuery.current = false;
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopAudio, language]);
    
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
    }, [stopAudio, speak, language]);


    const initializeAssistant = async () => {
        if (!SpeechRecognition || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            setHasPermission(false);
            setStatus('idle');
            return;
        }
        
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            
            let finalTranscript = '';

            recognition.onresult = (event: any) => {
                if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript.trim()) {
                    processQuery(finalTranscript.trim());
                    finalTranscript = '';
                }

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
                if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                if (!isProcessingQuery.current) setStatus('idle');
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'not-allowed') {
                    setHasPermission(false);
                    const msg = "Microphone permission denied. Please enable it in your browser settings to use the voice assistant.";
                    addMessage({ sender: 'ai', text: msg });
                    setMessages(getHistory());
                } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Speech recognition error:', event.error);
                }
                isProcessingQuery.current = false;
                setStatus('idle');
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
            stopAudio();
            setStatus('idle');
            if(recognitionRef.current) recognitionRef.current.start();
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

    
