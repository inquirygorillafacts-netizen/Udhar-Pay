'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Bell, Send, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OwnerNotificationPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSendMessage = async () => {
        if (message.trim().length === 0) {
            setError("Message cannot be empty.");
            return;
        }
        if (message.length > 500) {
            setError("Message cannot be longer than 500 characters.");
            return;
        }

        setIsSending(true);
        setError('');

        try {
            const messageRef = doc(firestore, 'notifications', 'ownerMessage');
            await setDoc(messageRef, {
                text: message,
                updatedAt: serverTimestamp()
            });
            toast({
                title: "Message Sent!",
                description: "Your message has been broadcast to all customers.",
            });
            setMessage('');
        } catch (err) {
            console.error("Error sending message:", err);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to send the message. Please try again.",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div className="login-card" style={{ maxWidth: '600px', margin: 'auto' }}>
                <div className="login-header" style={{ marginBottom: '30px' }}>
                    <div className="neu-icon"><div className="icon-inner"><Bell /></div></div>
                    <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Broadcast Message</h1>
                    <p style={{ color: '#6c7293' }}>Send a notification to all customers.</p>
                </div>

                <div style={{ padding: '15px 20px', background: '#fffbe6', borderRadius: '15px', border: '1px solid #fde047', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '30px' }}>
                    <AlertTriangle className="text-yellow-500" size={32} />
                    <div>
                        <h4 style={{ color: '#ca8a04', fontWeight: 'bold' }}>Important Note</h4>
                        <p style={{ color: '#a16207', margin: 0, fontSize: '14px' }}>
                            This message will be sent to every customer. It will appear in their dashboard until they have viewed it twice.
                        </p>
                    </div>
                </div>

                <div className="form-group">
                    <div className="neu-input" style={{borderRadius: '20px', boxShadow: 'inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff'}}>
                        <textarea
                            id="broadcast-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder=" "
                            required
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                padding: '20px',
                                color: '#3d4468',
                                fontSize: '16px',
                                outline: 'none',
                                minHeight: '150px',
                                resize: 'vertical'
                            }}
                        />
                         <label htmlFor="broadcast-message" style={{top: '20px', left: '20px', transform: 'translateY(-50%)', transition: 'all 0.3s ease', ...((message) && { top: '-5px', fontSize: '12px'})}}>Enter your message here...</label>
                    </div>
                     {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                </div>

                <button 
                    className={`neu-button ${isSending ? 'loading' : ''}`} 
                    onClick={handleSendMessage} 
                    disabled={isSending}
                    style={{ background: '#00c896', color: 'white' }}
                >
                    <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Send size={18}/> Send Broadcast</span>
                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                </button>
            </div>
        </main>
    );
}
