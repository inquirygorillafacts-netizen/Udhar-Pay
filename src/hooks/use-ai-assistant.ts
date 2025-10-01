'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type Mode = 'voice' | 'text';

// Polyfill for SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function useAiAssistant() {
  const [status, setStatus] = useState<Status>('idle');
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<Mode>('voice');
  const [aiResponse, setAiResponse] = useState('');
  const [inputText, setInputText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const processQuery = useCallback(async (text: string, audioRequested: boolean) => {
    setStatus('thinking');
    setAiResponse('');
    try {
      const response = await askAiAssistant({ 
        query: text,
        generateAudio: audioRequested
      });
      
      setAiResponse(response.text);

      if (response.audio && audioRequested) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = response.audio;
        audioRef.current.oncanplaythrough = () => {
          audioRef.current?.play();
          setStatus('speaking');
        };
        audioRef.current.onended = () => {
          setStatus('idle');
        };
        audioRef.current.onerror = () => {
            console.error("Error playing audio.");
            setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error with AI Assistant:', error);
      setAiResponse("Sorry, I encountered an error. Please try again.");
      setStatus('idle');
    }
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    setInputText('');
    await processQuery(text, false);
  }, [processQuery]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognition) {
      if (!SpeechRecognition) {
          alert("Sorry, your browser does not support voice recognition.");
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
      setAiResponse(''); // Clear previous response
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        processQuery(transcript, true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatus('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === 'listening') {
        setStatus('idle');
      }
    };
    
    recognition.start();
    recognitionRef.current = recognition;
  }, [isListening, processQuery, status]);
  
  const toggleMode = () => {
      setMode(prev => prev === 'voice' ? 'text' : 'voice');
      // Stop any ongoing speech or listening when switching modes
      if(audioRef.current) {
          audioRef.current.pause();
      }
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      setStatus('idle');
      setIsListening(false);
      setAiResponse('');
  }

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if(recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, []);

  return { status, isListening, startListening, stopListening, aiResponse, mode, toggleMode, inputText, setInputText, sendTextMessage };
}
