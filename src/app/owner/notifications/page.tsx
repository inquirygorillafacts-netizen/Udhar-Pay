'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Bell, Send, AlertTriangle, Users, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';


type TargetAudience = 'customers' | 'shopkeepers' | 'both';

export default function OwnerNotificationPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState<TargetAudience | null>(null);

    const handleSendMessage = async () => {
        if (!target) {
            setError("Please select who to send the message to.");
            return;
        }
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
            const batch = writeBatch(firestore);
            const messageData = {
                text: message,
                updatedAt: serverTimestamp()
            };

            if (target === 'customers' || target === 'both') {
                const customerMessageRef = doc(firestore, 'notifications', 'customerMessage');
                batch.set(customerMessageRef, messageData);
            }
            if (target === 'shopkeepers' || target === 'both') {
                const shopkeeperMessageRef = doc(firestore, 'notifications', 'shopkeeperMessage');
                batch.set(shopkeeperMessageRef, messageData);
            }
            
            await batch.commit();

            toast({
                title: "Message Sent!",
                description: `Your message has been broadcast to ${target}.`,
            });
            setMessage('');
            setTarget(null); // Reset target after sending
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
                    <p style={{ color: '#6c7293' }}>Send a notification to your users.</p>
                </div>

                <div style={{ padding: '15px 20px', background: '#fffbe6', borderRadius: '15px', border: '1px solid #fde047', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '30px' }}>
                    <AlertTriangle className="text-yellow-500" size={32} />
                    <div>
                        <h4 style={{ color: '#ca8a04', fontWeight: 'bold' }}>Important Note</h4>
                        <p style={{ color: '#a16207', margin: 0, fontSize: '14px' }}>
                            This message will appear in the selected users' dashboard until they have viewed it twice.
                        </p>
                    </div>
                </div>

                <div className="form-group">
                     <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1rem', paddingBottom: 0}}>Send To:</h3>
                     <RadioGroup onValueChange={(value: TargetAudience) => setTarget(value)} value={target ?? ''} className="flex justify-center gap-4 mb-8">
                        <Label htmlFor="customers" className={`neu-button ${target === 'customers' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <RadioGroupItem value="customers" id="customers" className="sr-only" />
                            <Users size={20} /> Customers
                        </Label>
                         <Label htmlFor="shopkeepers" className={`neu-button ${target === 'shopkeepers' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <RadioGroupItem value="shopkeepers" id="shopkeepers" className="sr-only" />
                            <Store size={20} /> Shopkeepers
                        </Label>
                         <Label htmlFor="both" className={`neu-button ${target === 'both' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px'}}>
                            <RadioGroupItem value="both" id="both" className="sr-only" />
                            Both
                        </Label>
                    </RadioGroup>
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
                    disabled={isSending || !target}
                    style={{ background: '#00c896', color: 'white' }}
                >
                    <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Send size={18}/> Send Broadcast</span>
                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                </button>
            </div>
        </main>
    );
}