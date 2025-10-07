
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, Settings, ArrowLeft, Mic, Ear, BrainCircuit, X, MicOff } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';
import './ai.css';


type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function VoiceAssistantPage() {
    const router = useRouter();
    const [status, setStatus] = useState<Status>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const isProcessingQuery = useRef(false);

    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);
    
    const stopAudio = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();
        }
    }, []);

    const startListening = useCallback(() => {
        if (!SpeechRecognition || !hasPermission || isMuted || status !== 'idle') {
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Could not start recognition (might be running already): ", e);
                setStatus('idle');
            }
        }
    }, [hasPermission, isMuted, status]);

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error("Browser does not support speech synthesis.");
            setStatus('idle');
            isProcessingQuery.current = false;
            startListening();
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
            startListening(); // Listen again after speaking
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            setStatus('idle');
            isProcessingQuery.current = false;
            startListening(); // Try to listen again even on error
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopAudio, startListening]);
    
    const processQuery = useCallback(async (text: string) => {
        if (isProcessingQuery.current) return;
        isProcessingQuery.current = true;
        
        setStatus('thinking');
        stopAudio();

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
            speak(errorMessage); // Speak the error message
        }
    }, [stopAudio, speak]);


    // Initial permission check and setup
    useEffect(() => {
        const checkPermissionAndStart = async () => {
            if (!SpeechRecognition || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Your browser does not support audio recording.');
                setHasPermission(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                setHasPermission(true);

                // Setup recognition instance once permission is granted
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // Important: process after each pause
                recognition.interimResults = false;
                recognition.lang = 'hi-IN';

                recognition.onstart = () => setStatus('listening');
                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript.trim();
                    if (transcript) processQuery(transcript);
                };
                recognition.onend = () => {
                    if (!isProcessingQuery.current) setStatus('idle');
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
                
                startListening();

            } catch (err) {
                console.error('Microphone permission denied.', err);
                setHasPermission(false);
                setStatus('idle');
                addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it in your browser settings to use the voice assistant." });
                setMessages(getHistory());
            }
        };

        checkPermissionAndStart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    useEffect(() => {
        setMessages(getHistory());
    }, []);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    
    const handleMuteToggle = () => {
        const nextMuteState = !isMuted;
        setIsMuted(nextMuteState);
        
        if (nextMuteState) {
            if (recognitionRef.current) recognitionRef.current.abort();
            stopAudio();
            isProcessingQuery.current = false;
            setStatus('idle');
        } else {
            if (status === 'idle') startListening();
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
        }
    }, [stopAudio]);

    const statusInfo = {
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
                <button onClick={handleMuteToggle} className={`glass-button ${isMuted ? 'active' : ''}`}>
                    {isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
                </button>
                <button onClick={() => setIsTextModalOpen(true)} className="glass-button">
                    <MessageSquare size={18}/>
                </button>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
