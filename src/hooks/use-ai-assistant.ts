'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

// Polyfill for SpeechRecognition
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export default function useAiAssistant() {
  const [status, setStatus] = useState<Status>('idle');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const processAudio = useCallback(async (text: string) => {
    setStatus('thinking');
    try {
      const response = await askAiAssistant({ query: text });
      
      if (response.audio) {
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
      setStatus('idle');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      // Status will be set to 'thinking' by the onresult handler
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        processAudio(transcript);
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
  }, [isListening, processAudio, status]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
    }
    // Cleanup audio on unmount
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }
  }, []);

  return { status, isListening, startListening, stopListening };
}
