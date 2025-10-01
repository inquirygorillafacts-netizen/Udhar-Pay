'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader, MessageSquare, Send, Bot, User, X } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface TextAssistantModalProps {
    onClose: () => void;
}

export default function TextAssistantModal({ onClose }: TextAssistantModalProps) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendClick = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setStatus('thinking');

    try {
      const response = await askAiAssistant({
        query: query,
        generateAudio: false, // We only want text
      });
      setMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, something went wrong." }]);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="modal-overlay ai-chat-modal-overlay" onClick={onClose}>
      <div 
        className="login-card ai-chat-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <header 
          className="login-header" 
          style={{
            marginBottom: '20px', 
            paddingBottom: '20px', 
            borderBottom: '2px solid #d1d9e6',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{textAlign: 'left', flex: 1}}>
              <h1 style={{fontSize: '1.5rem', marginBottom: '0'}}>Text Assistant</h1>
              <p style={{fontSize: '0.9rem', margin: 0}}>Chat with the Udhar Pay AI</p>
            </div>
             <button onClick={onClose} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <X size={20} />
            </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px', marginBottom: '20px' }}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            {messages.map((msg, index) => (
              <div key={index} style={{display: 'flex', gap: '15px', alignItems: 'flex-start', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.sender === 'ai' && (
                  <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, flexShrink: 0, background: '#00c896'}}>
                      <Bot size={20} color="white"/>
                  </div>
                )}
                <div style={{
                  padding: '12px 18px',
                  background: msg.sender === 'user' ? '#00c896' : '#e0e5ec',
                  color: msg.sender === 'user' ? 'white' : '#3d4468',
                  borderRadius: '20px',
                  boxShadow: msg.sender === 'user' ? '4px 4px 10px #bec3cf' : 'inset 4px 4px 8px #bec3cf, inset -4px -4px 8px #ffffff',
                  maxWidth: '80%'
                }}>
                  <p style={{ margin: 0, lineHeight: 1.5, fontSize: '15px', color: 'inherit' }}>{msg.text}</p>
                </div>
                 {msg.sender === 'user' && (
                  <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, flexShrink: 0}}>
                      <User size={20}/>
                  </div>
                )}
              </div>
            ))}
            {status === 'thinking' && (
                 <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                     <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, flexShrink: 0, background: '#00c896'}}>
                        <Bot size={20} color="white"/>
                     </div>
                     <div style={{padding: '12px 18px', background: '#e0e5ec', borderRadius: '20px', boxShadow: 'inset 4px 4px 8px #bec3cf, inset -4px -4px 8px #ffffff' }}>
                        <Loader size={20} className="animate-spin text-muted-foreground" />
                     </div>
                 </div>
            )}
             <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSendClick} style={{ marginBottom: 0, marginTop: 'auto' }}>
          <div className="neu-input" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="input-icon"><MessageSquare /></div>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ paddingLeft: '55px', fontSize: '1rem' }}
              disabled={status === 'thinking'}
            />
            <button
              type="submit"
              className={`neu-button ${status === 'thinking' ? 'loading' : ''}`}
              style={{ width: 'auto', margin: '8px', padding: '10px 20px', flexShrink: 0, background: '#00c896', color: 'white' }}
              disabled={status === 'thinking' || !inputText.trim()}
            >
              <span className="btn-text"><Send size={18} /></span>
              <div className="btn-loader"><div className="neu-spinner"></div></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
