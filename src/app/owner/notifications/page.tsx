'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, serverTimestamp, collection, addDoc, onSnapshot, orderBy, query, deleteDoc } from 'firebase/firestore';
import { Bell, Send, AlertTriangle, Users, Store, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type TargetAudience = 'customers' | 'shopkeepers' | 'both';

interface OwnerMessage {
    id: string;
    text: string;
    target: TargetAudience;
    createdAt: {
        toDate: () => Date;
    };
}

export default function OwnerNotificationPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState<TargetAudience | null>(null);

    const [sentMessages, setSentMessages] = useState<OwnerMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        
        const messagesRef = collection(firestore, 'owner_messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OwnerMessage));
            setSentMessages(fetchedMessages);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [firestore]);

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
            await addDoc(collection(firestore, 'owner_messages'), {
                text: message,
                target: target,
                createdAt: serverTimestamp(),
                readBy: []
            });

            toast({
                title: "Message Sent!",
                description: `Your message has been broadcast to ${target}.`,
            });
            setMessage('');
            setTarget(null);
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
    
    const handleDeleteMessage = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const confirmDelete = async () => {
        if (!messageToDelete || !firestore) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'owner_messages', messageToDelete));
            toast({
                title: 'Message Deleted',
                description: 'The broadcast message has been removed.'
            });
            setMessageToDelete(null);
        } catch (error) {
            console.error("Error deleting message:", error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not delete the message. Please try again.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
        {messageToDelete && (
            <div className="modal-overlay">
                <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center', marginBottom: '25px'}}>
                        <div className="neu-icon" style={{background: '#ffdfe4', margin: '0 auto 20px'}}>
                            <AlertTriangle size={30} className="text-red-500"/>
                        </div>
                        <h2 style={{color: '#3d4468', fontSize: '1.5rem'}}>Confirm Deletion</h2>
                    </div>
                     <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '30px', fontSize: '1rem', lineHeight: 1.7}}>
                        Are you sure you want to permanently delete this message for everyone? This action cannot be undone.
                    </p>
                    <div style={{display: 'flex', gap: '20px'}}>
                        <button className="neu-button" onClick={() => setMessageToDelete(null)} style={{margin:0, flex: 1}}>Cancel</button>
                        <button className={`neu-button ${isDeleting ? 'loading' : ''}`} onClick={confirmDelete} disabled={isDeleting} style={{margin:0, flex: 1, background: '#ff3b5c', color: 'white'}}>
                            <span className="btn-text">Yes, Delete</span>
                            <div className="btn-loader"><div className="neu-spinner"></div></div>
                        </button>
                    </div>
                </div>
            </div>
        )}
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div className="login-card" style={{ maxWidth: '700px', margin: 'auto' }}>
                <div className="login-header" style={{ marginBottom: '30px' }}>
                    <div className="neu-icon"><div className="icon-inner"><Bell /></div></div>
                    <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>Broadcast Messages</h1>
                    <p style={{ color: '#6c7293' }}>Send notifications to your users.</p>
                </div>
                
                <div className="setting-section" style={{marginBottom: '40px'}}>
                    <div className="form-group">
                         <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1rem', paddingBottom: 0}}>Send To:</h3>
                         <RadioGroup onValueChange={(value: TargetAudience) => setTarget(value)} value={target ?? ''} className="flex justify-center gap-4 my-4">
                             <Label htmlFor="customers" className={`neu-button ${target === 'customers' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                <RadioGroupItem value="customers" id="customers" className="sr-only" />
                                <Users size={20} /> Customers
                            </Label>
                             <Label htmlFor="shopkeepers" className={`neu-button ${target === 'shopkeepers' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                <RadioGroupItem value="shopkeepers" id="shopkeepers" className="sr-only" />
                                <Store size={20} /> Shopkeepers
                            </Label>
                             <Label htmlFor="both" className={`neu-button ${target === 'both' ? 'active' : ''}`} style={{flex: 1, margin: 0, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
                                    width: '100%', background: 'transparent', border: 'none', padding: '20px',
                                    color: '#3d4468', fontSize: '16px', outline: 'none', minHeight: '120px', resize: 'vertical'
                                }}
                            />
                             <label htmlFor="broadcast-message" style={{top: '20px', left: '20px', transform: 'translateY(-50%)', transition: 'all 0.3s ease', ...((message) && { top: '-5px', fontSize: '12px'})}}>Enter your message here...</label>
                        </div>
                         {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                    </div>

                    <button 
                        className={`neu-button ${isSending ? 'loading' : ''}`} 
                        onClick={handleSendMessage} 
                        disabled={isSending || !target || !message}
                        style={{ background: '#00c896', color: 'white' }}
                    >
                        <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Send size={18}/> Send Broadcast</span>
                        <div className="btn-loader"><div className="neu-spinner"></div></div>
                    </button>
                </div>

                <div className="setting-section">
                    <h3 className="setting-title" style={{textAlign: 'center'}}>Sent Messages</h3>
                    {loadingMessages ? <div className="neu-spinner mx-auto"></div> :
                     sentMessages.length === 0 ? <p style={{textAlign: 'center', color: '#9499b7'}}>You haven't sent any messages yet.</p> :
                     (
                         <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                             {sentMessages.map(msg => (
                                 <div key={msg.id} className="neu-input" style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                     <div>
                                         <p style={{color: '#6c7293', marginBottom: '8px', whiteSpace: 'pre-wrap'}}>{msg.text}</p>
                                         <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                             <span style={{fontSize: '12px', color: '#9499b7', fontWeight: 500}}>{msg.createdAt?.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                             <span style={{padding: '3px 8px', background: '#e0e5ec', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#3d4468', textTransform: 'capitalize'}}>{msg.target}</span>
                                         </div>
                                     </div>
                                      <button onClick={() => handleDeleteMessage(msg.id)} className="neu-button" style={{width: 'auto', height: 'auto', padding: '10px', margin: 0, background: '#ffdfe4'}}>
                                        <Trash2 size={16} className="text-red-500" />
                                     </button>
                                 </div>
                             ))}
                         </div>
                     )
                    }
                </div>
            </div>
        </main>
        </>
    );
}
