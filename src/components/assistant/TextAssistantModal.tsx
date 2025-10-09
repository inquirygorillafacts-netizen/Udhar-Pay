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
    setMessages([...getHistory()]); // Get a new copy to trigger re-render
    setStatus('thinking');

    try {
      const response = await askAiAssistant({
        query: query,
        history: getHistory(),
      });
      addMessage({ sender: 'ai', text: response.text });
      setMessages([...getHistory()]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = "Sorry, something went wrong.";
      addMessage({ sender: 'ai', text: errorMessage });
      setMessages([...getHistory()]);
    } finally {
      setStatus('idle');
    }
  };

  const handleClearChat = () => {
      clearHistory();
      setMessages([]);
  }

  return (
    <div className="modal-overlay" style={{ padding: 0 }} onClick={onClose}>
      <div 
        style={{
            width: '100%',
            height: '100vh',
            background: '#1a1a1d',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header 
          className="modal-header" 
          style={{
            marginBottom: '0', 
            padding: '1rem',
            borderBottom: '1px solid #333',
            color: '#fff',
            flexShrink: 0
          }}>
            <div style={{textAlign: 'left', flex: 1}}>
              <h1 style={{fontSize: '1.5rem', marginBottom: '0', color: '#fff'}}>Text Assistant</h1>
              <p style={{fontSize: '0.9rem', margin: 0, color: '#999'}}>Chat with the Udhar Pay AI</p>
            </div>
            <button onClick={handleClearChat} className="glass-button" style={{width: '45px', height: '45px'}}>
                <Trash2 size={20} />
            </button>
             <button onClick={onClose} className="glass-button" style={{width: '45px', height: '45px', marginLeft: '10px'}}>
              <X size={20} />
            </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: 'calc(6rem + 10px)' }}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            {messages.length === 0 && (
                <div style={{textAlign: 'center', color: '#999', paddingTop: '20vh'}}>
                    <Bot size={40} className="mx-auto mb-4"/>
                    <p>Ask me anything about Udhar Pay!</p>
                </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble-wrapper ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                 {msg.sender === 'ai' && (
                  <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, marginRight: '10px', flexShrink: 0, background: 'rgba(0, 200, 150, 0.8)', border: 'none', boxShadow: 'none' }}>
                      <Bot size={20} color="white"/>
                  </div>
                )}
                <div className="chat-bubble" style={{background: msg.sender === 'ai' ? '#333' : 'rgba(0, 200, 150, 0.6)', color: '#fff' }}>
                  <p style={{ margin: 0, lineHeight: 1.5, fontSize: '15px' }}>{msg.text}</p>
                </div>
              </div>
            ))}
            {status === 'thinking' && (
                 <div className="chat-bubble-wrapper ai">
                     <div className="neu-icon" style={{width: '40px', height: '40px', margin: 0, marginRight: '10px', flexShrink: 0, background: 'rgba(0, 200, 150, 0.8)', border: 'none', boxShadow: 'none'}}>
                        <Bot size={20} color="white"/>
                     </div>
                     <div className="chat-bubble" style={{background: '#333'}}>
                        <Loader size={20} className="animate-spin text-muted-foreground" />
                     </div>
                 </div>
            )}
             <div ref={messagesEndRef} />
          </div>
        </div>

        <form 
            onSubmit={handleSendClick} 
            style={{ 
                padding: '1rem', 
                flexShrink: 0, 
                position: 'fixed', 
                bottom: 0, 
                left: 0,
                right: 0,
                background: 'transparent',
            }}
        >
          <div className="neu-input" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 200, 150, 0.6)', borderRadius: '15px', border: '1px solid white' }}>
            <div className="input-icon"><MessageSquare color="#eee" /></div>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ paddingLeft: '55px', fontSize: '1rem', color: '#fff' }}
              disabled={status === 'thinking'}
            />
            <button
              type="submit"
              className="glass-button"
              style={{ width: '45px', height: '45px', margin: '8px', padding: '10px', background: 'rgba(255,255,255,0.2)' }}
              disabled={status === 'thinking' || !inputText.trim()}
            >
              {status === 'thinking' ? <Loader size={18} className="animate-spin text-white"/> : <Send size={18} color="white" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
