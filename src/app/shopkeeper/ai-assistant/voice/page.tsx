'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, ListMusic, ArrowLeft, Mic, Ear, BrainCircuit, X } from 'lucide-react';
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
    const [isAssistantOn, setIsAssistantOn] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setMessages(getHistory());
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
    }, []);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                await audioRef.current.play();
                setStatus('speaking');

                audioRef.current.onended = () => {
                    if (isAssistantOn) setStatus('listening');
                    else setStatus('idle');
                };
            } else {
                 if (isAssistantOn) setStatus('listening');
                 else setStatus('idle');
            }
        } catch (error) {
            console.error('Error with AI Assistant:', error);
            const errorMessage = "माफ़ कीजिए, कोई त्रुटि हुई। कृपया फिर प्रयास करें।";
            addMessage({sender: 'ai', text: errorMessage});
            setMessages(getHistory());
            if (isAssistantOn) setStatus('listening');
            else setStatus('idle');
        }
    }, [currentVoiceId, isAssistantOn]);


    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            alert("माफ़ कीजिए, आपका ब्राउज़र वॉइस रिकग्निशन का समर्थन नहीं करता है।");
            return;
        }
        if (recognitionRef.current) recognitionRef.current.stop();

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onstart = () => setStatus('listening');

        recognition.onresult = (event: any) => {
            if (status === 'speaking') stopAudio();

            let finalTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            
            const transcript = finalTranscript.trim();
            if (transcript) processQuery(transcript);
        };
        
        recognition.onend = () => {
            if (isAssistantOn) {
                try { recognition.start(); }
                catch (e) { console.error("Could not restart recognition:", e); }
            } else {
                setStatus('idle');
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
                addMessage({sender: 'ai', text: "माफ़ कीजिए, मैं आपकी बात नहीं सुन सका।"});
                setMessages(getHistory());
            }
        };
        
        try { recognition.start(); } 
        catch (e) { console.error("Could not start recognition: ", e); }
        recognitionRef.current = recognition;

    }, [isAssistantOn, processQuery, status]); 

    const checkPermissionAndStart = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            setHasPermission(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);
            setIsAssistantOn(true);
        } catch (err) {
            console.error('Microphone permission denied.', err);
            setHasPermission(false);
        }
    };
    
    const handlePowerToggle = () => {
        if (!isAssistantOn) {
            checkPermissionAndStart();
        } else {
            setIsAssistantOn(false);
        }
    };

    useEffect(() => {
        if (isAssistantOn && hasPermission) {
            startListening();
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.abort(); 
            }
            stopAudio();
            setStatus('idle');
        }
    }, [isAssistantOn, hasPermission, startListening]);
    
    const statusInfo = {
        idle: { text: "AI is Off", icon: <Mic size={16}/> },
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
                <div className="glass-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Select a Voice</h2>
                        <button className="glass-button" style={{width: '40px', height: '40px', padding: 0}} onClick={() => setIsVoiceModalOpen(false)}><X size={20}/></button>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        {availableVoices.map((voice, index) => (
                            <button
                                key={voice.voiceId}
                                className={`glass-button text-left ${index === currentVoiceIndex ? 'active' : ''}`}
                                style={{margin: 0, justifyContent: 'flex-start', textAlign: 'left', padding: '15px 20px', height: 'auto'}}
                                onClick={() => selectVoice(index)}
                            >
                                <div>
                                    <h4 style={{margin:0, fontSize: '1rem', color: '#fff'}}>{voice.name}</h4>
                                    <p style={{margin:0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)'}}>{voice.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <main className="ai-container">
            <header className="ai-header">
                <button onClick={() => router.back()} className="glass-button">
                    <ArrowLeft size={20}/>
                </button>
                <div className="flex-grow text-center">
                    <h1 className="text-xl font-bold text-white">AI Voice Assistant</h1>
                </div>
                <button onClick={() => setIsTextModalOpen(true)} className="glass-button">
                    <MessageSquare size={18}/>
                </button>
            </header>

            <div className="ai-video-container">
                 <video 
                    src="/ai.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="ai-video-orb"
                />
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
                <div className="status-indicator">
                    {isAssistantOn ? statusInfo[status].icon : statusInfo.idle.icon}
                    <span>{isAssistantOn ? statusInfo[status].text : statusInfo.idle.text}</span>
                </div>
                 {hasPermission === false && (
                    <div style={{color: '#ff9999', textAlign: 'center', fontSize: '14px', fontWeight: 500}}>
                        Enable mic permission.
                    </div>
                 )}
                 <div className="flex items-center gap-4">
                    <button onClick={() => setIsVoiceModalOpen(true)} className="glass-button" style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}>
                        <ListMusic size={16}/> Voice Mode
                    </button>
                    <div className={`neu-toggle-switch big-toggle ${isAssistantOn ? 'active' : ''}`} onClick={handlePowerToggle}>
                        <div className="neu-toggle-handle"></div>
                    </div>
                </div>
            </div>
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
