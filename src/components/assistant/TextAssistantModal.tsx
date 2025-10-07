'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader, MessageSquare, Send, Bot, User, X, Trash2 } from 'lucide-react';
import { askAiAssistant } from '@/ai/flows/assistant-flow';
import { getHistory, clearHistory, addMessage, ChatMessage } from '@/lib/ai-memory';

interface TextAssistantModalProps {
    onClose: () => void;
}

export default function TextAssistantModal({ onClose }: TextAssistantModalProps) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Load history on initial render
  useEffect(() => {
    setMessages(getHistory());
  }, []);

  useEffect(scrollToBottom, [messages]);

  const handleSendClick = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    setInputText('');
    
    addMessage({ sender: 'user', text: query });
    setMessages(getHistory());
    setStatus('thinking');

    try {
      const response = await askAiAssistant({
        query: query,
        history: getHistory(),
        generateAudio: false, // We only want text
      });
      addMessage({ sender: 'ai', text: response.text });
      setMessages(getHistory());
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = "Sorry, something went wrong.";
      addMessage({ sender: 'ai', text: errorMessage });
      setMessages(getHistory());
    } finally {
      setStatus('idle');
    }
  };

  const handleClearChat = () => {
      clearHistory();
      setMessages([]);
  }

  return (
    <div className="modal-overlay ai-chat-modal-overlay" onClick={onClose}>
      <div 
        className="login-card ai-chat-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <header 
          className="modal-header" 
          style={{
            marginBottom: '20px', 
            paddingBottom: '20px', 
            borderBottom: '2px solid #d1d9e6',
          }}>
            <div style={{textAlign: 'left', flex: 1}}>
              <h1 style={{fontSize: '1.5rem', marginBottom: '0'}}>Text Assistant</h1>
              <p style={{fontSize: '0.9rem', margin: 0}}>Chat with the Udhar Pay AI</p>
            </div>
            <button onClick={handleClearChat} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Trash2 size={20} />
            </button>
             <button onClick={onClose} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: '0 0 0 10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <X size={20} />
            </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px 10px', display: 'flex', flexDirection: 'column' }}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1, justifyContent: 'flex-end'}}>
            {messages.length === 0 && (
                <div style={{textAlign: 'center', color: '#9499b7', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <Bot size={40} className="mx-auto mb-4"/>
                    <p>Ask me anything about Udhar Pay!</p>
                </div>
            )}
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

        <form onSubmit={handleSendClick} style={{ padding: '10px', flexShrink: 0, marginBottom: 0 }}>
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
