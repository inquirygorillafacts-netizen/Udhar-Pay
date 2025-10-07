'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, ListMusic, ArrowLeft, Mic, Ear, BrainCircuit, X, MicOff } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';
import './ai.css';


type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const availableVoices = [
    { voiceId: 'it-IT-lorenzo', name: 'Lorenzo', description: 'Italian Accent', style: 'Conversational', multiNativeLocale: 'hi-IN' },
    { voiceId: 'hi-IN-kabir', name: 'Kabir', description: 'Indian Hindi', style: 'General' },
    { voiceId: 'en-UK-hazel', name: 'Hazel', description: 'UK English Accent', style: 'Conversational', multiNativeLocale: 'hi_IN' },
    { voiceId: 'de-DE-josephine', name: 'Josephine', description: 'German Accent', style: 'Conversational', multiNativeLocale: 'hi-IN' },
];

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
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isProcessingQuery = useRef(false);
    
    const currentVoiceId = availableVoices[currentVoiceIndex].voiceId;

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.onended = null;
        }
    }, []);
    
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
                generateAudio: true,
                voiceId: currentVoiceId,
            });

            addMessage({ sender: 'ai', text: response.text });
            setMessages(getHistory());

            if (response.audio && audioRef.current) {
                audioRef.current.src = response.audio;
                setStatus('speaking');
                
                audioRef.current.onended = () => {
                    isProcessingQuery.current = false;
                    setStatus('idle');
                };
                await audioRef.current.play();
                
            } else {
                 isProcessingQuery.current = false;
                 setStatus('idle');
            }
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            const errorMessage = "माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।";
            addMessage({sender: 'ai', text: errorMessage});
            setMessages(getHistory());
            isProcessingQuery.current = false;
            setStatus('idle');
        }
    }, [currentVoiceId, stopAudio]);


    const startListening = useCallback(() => {
        if (!SpeechRecognition || !hasPermission || isMuted || status !== 'idle') {
            return;
        }
        
        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'hi-IN';

            recognition.onstart = () => {
                setStatus('listening');
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript.trim();
                if (transcript) {
                    processQuery(transcript);
                }
            };
            
            recognition.onend = () => {
                if (!isProcessingQuery.current && !isMuted) {
                    setStatus('idle');
                }
            };
            
            recognition.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('Speech recognition error:', event.error);
                }
                isProcessingQuery.current = false;
                setStatus('idle');
            };
            recognitionRef.current = recognition;
        }
        
        try {
             if (status === 'idle') {
                recognitionRef.current.start();
             }
        } catch(e) {
             console.error("Could not start recognition (might be running already): ", e);
             setStatus('idle');
        }

    }, [hasPermission, isMuted, status, processQuery]);


    // Effect to control listening state based on other states
    useEffect(() => {
        if (!isMuted && !isProcessingQuery.current && status === 'idle') {
            startListening();
        }
    }, [isMuted, status, startListening]);


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
            } catch (err) {
                console.error('Microphone permission denied.', err);
                setHasPermission(false);
                setStatus('idle');
                addMessage({ sender: 'ai', text: "Microphone permission denied. Please enable it in your browser settings to use the voice assistant." });
                setMessages(getHistory());
            }
        };

        checkPermissionAndStart();
    }, []);


    useEffect(() => {
        setMessages(getHistory());
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
    }, []);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    
    useEffect(() => {
        if (isMuted) {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            stopAudio();
            setStatus('idle');
        }
    }, [isMuted, stopAudio]);


    // Cleanup on unmount
    useEffect(() => {
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
    }, []);

    const handleMuteToggle = () => setIsMuted(!isMuted);

    const statusInfo = {
        idle: { text: isMuted ? "Muted" : "Idle", icon: isMuted ? <MicOff size={16}/> : <Mic size={16}/> },
        listening: { text: "Listening...", icon: <Ear size={16}/> },
        thinking: { text: "Thinking...", icon: <BrainCircuit size={16}/> },
        speaking: { text: "Speaking...", icon: <Bot size={16}/> },
    };
    
    const selectVoice = (index: number) => {
        setCurrentVoiceIndex(index);
        setIsVoiceModalOpen(false);
    }

    return (
      <>
        {isVoiceModalOpen && (
            <div className="modal-overlay" onClick={() => setIsVoiceModalOpen(false)}>
                <div className="login-card modal-content" style={{maxWidth: '450px', background: 'white'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 style={{color: '#3d4468'}}>Select a Voice</h2>
                        <button className="close-button" style={{color: '#9499b7'}} onClick={() => setIsVoiceModalOpen(false)}><X size={28}/></button>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        {availableVoices.map((voice, index) => (
                            <button
                                key={voice.voiceId}
                                className={`neu-button text-left ${index === currentVoiceIndex ? 'active' : ''}`}
                                style={{margin: 0, justifyContent: 'flex-start', textAlign: 'left', padding: '15px 20px', height: 'auto'}}
                                onClick={() => selectVoice(index)}
                            >
                                <div>
                                    <h4 style={{margin:0, fontSize: '1rem', color: index === currentVoiceIndex ? '#fff' : '#3d4468' }}>{voice.name}</h4>
                                    <p style={{margin:0, fontSize: '0.8rem', color: index === currentVoiceIndex ? 'rgba(255,255,255,0.7)' : '#6c7293'}}>{voice.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
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
                 <button onClick={() => setIsVoiceModalOpen(true)} className="glass-button">
                    <ListMusic size={18}/>
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
