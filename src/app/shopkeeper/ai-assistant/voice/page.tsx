'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, Shuffle, User, ArrowLeft, Power, Mic, Ear, BrainCircuit } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import TextAssistantModal from '@/components/assistant/TextAssistantModal';
import { getHistory, addMessage, ChatMessage } from '@/lib/ai-memory';
import { useRouter } from 'next/navigation';
import './ai.css';


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
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setMessages(getHistory());
        // Initialize audioRef once.
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
        recognition.continuous = false; // Process after a single utterance.
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
            // If the assistant is still on, automatically restart listening.
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
            // Request permission. This will trigger the browser's permission prompt if not already granted.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // We don't need to keep the stream, just get permission.
            setHasPermission(true);
            setIsAssistantOn(true);
        } catch (err) {
            console.error('Microphone permission denied.', err);
            setHasPermission(false);
        }
    };
    
    const handlePowerClick = () => {
        if (!isAssistantOn) {
            checkPermissionAndStart();
        } else {
            setIsAssistantOn(false);
        }
    };

    // Effect to start/stop listening when the assistant is toggled on/off
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAssistantOn, hasPermission, startListening]);
    
    const statusInfo = {
        idle: { text: "AI is idle", icon: <Mic size={16}/> },
        listening: { text: "Listening...", icon: <Ear size={16}/> },
        thinking: { text: "Thinking...", icon: <BrainCircuit size={16}/> },
        speaking: { text: "Speaking...", icon: <Bot size={16}/> },
    };

    return (
      <>
        <main className="ai-container">
             <header className="dashboard-header" style={{ position: 'sticky', top: '20px', zIndex: 10, background: '#e0e5ec', margin: '0 20px', width: 'auto' }}>
                <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <ArrowLeft size={20}/>
                </button>
                <div style={{textAlign: 'center', flexGrow: 1}}>
                    <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>AI Voice Assistant</h1>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                     <button onClick={() => setIsTextModalOpen(true)} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <MessageSquare size={18}/>
                    </button>
                    <button onClick={() => setCurrentVoiceIndex((prev) => (prev + 1) % availableVoices.length)} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Shuffle size={18}/>
                    </button>
                </div>
            </header>

            <div className="ai-visualizer">
                 <div className={`ai-orb-wrapper ${isAssistantOn ? 'on' : 'off'}`}>
                    <div className="ai-orb">
                        <div className={`ai-glow ${status}`}></div>
                        <video 
                            src="/ai.mp4" 
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                            className="ai-video-core"
                          />
                    </div>
                 </div>
                 
                 <button className={`neu-button power-button ${isAssistantOn ? 'on' : 'off'}`} onClick={handlePowerClick}>
                    <Power size={24}/>
                    <span>{isAssistantOn ? 'Turn Off' : 'Turn On'}</span>
                 </button>

                 {isAssistantOn && (
                    <div className="status-indicator">
                        {statusInfo[status].icon}
                        <span>{statusInfo[status].text}</span>
                    </div>
                 )}
                 {hasPermission === false && (
                    <div style={{color: '#ff3b5c', textAlign: 'center', marginTop: '10px', fontSize: '14px', fontWeight: 500}}>
                        Microphone permission denied. Please enable it in your browser settings.
                    </div>
                 )}

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
        </main>
        {isTextModalOpen && <TextAssistantModal onClose={() => setIsTextModalOpen(false)} />}
      </>
    );
}
