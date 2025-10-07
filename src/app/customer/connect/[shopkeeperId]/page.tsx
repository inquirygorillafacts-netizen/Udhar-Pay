'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, User, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShopkeeperProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

export default function ConnectPage() {
  const router = useRouter();
  const params = useParams();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const shopkeeperId = params.shopkeeperId as string;

  const [shopkeeper, setShopkeeper] = useState<ShopkeeperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!shopkeeperId || !auth.currentUser || !firestore) {
      router.push('/customer/dashboard');
      return;
    }

    const fetchShopkeeperProfile = async () => {
      try {
        const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
        const shopkeeperSnap = await getDoc(shopkeeperRef);

        if (shopkeeperSnap.exists()) {
          setShopkeeper({ uid: shopkeeperId, ...shopkeeperSnap.data() } as ShopkeeperProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Shopkeeper not found.' });
          router.push('/customer/dashboard');
        }
      } catch (err) {
        console.error("Error fetching shopkeeper profile:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load data. Please try again.' });
        router.push('/customer/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchShopkeeperProfile();
  }, [shopkeeperId, firestore, auth.currentUser, router, toast]);

  const handleSendRequest = async () => {
    if (isProcessing || !auth.currentUser || !firestore || !shopkeeper) return;
    setIsProcessing(true);

    try {
        const requestsRef = collection(firestore, 'connectionRequests');
        
        // This query checks for any existing pending requests between the two users.
        const qExisting = query(requestsRef, 
            where('customerId', '==', auth.currentUser.uid), 
            where('shopkeeperId', '==', shopkeeperId),
            where('status', '==', 'pending')
        );
        const existingRequestSnapshot = await getDocs(qExisting);
        
        if (!existingRequestSnapshot.empty) {
            toast({ title: "Request Already Sent", description: "A connection request is already pending approval." });
            setRequestSent(true); // Visually confirm that a request is pending.
            return;
        }

        // Create the new connection request.
        // This request object is IDENTICAL to the one created via manual code entry.
        await addDoc(requestsRef, {
            customerId: auth.currentUser.uid,
            shopkeeperId: shopkeeperId,
            customerName: auth.currentUser.displayName || 'A new customer',
            status: 'pending',
            createdAt: serverTimestamp()
        });
        
        setRequestSent(true);
        toast({ title: "Request Sent!", description: `Your connection request has been sent to ${shopkeeper?.displayName}.` });

        // Redirect user to dashboard after a short delay
        setTimeout(() => {
            router.push('/customer/dashboard');
        }, 2000);


    } catch (err) {
        console.error("Error sending connection request:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send request. Please try again.' });
    } finally {
        setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="neu-spinner"></div></div>;
  }

  if (!shopkeeper) {
    return <div className="loading-container">Shopkeeper not found.</div>;
  }
  
  return (
    <div>
      <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
        <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <ArrowLeft size={20} />
        </button>
        <div style={{textAlign: 'center', flexGrow: 1}}>
          <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Connect to Shopkeeper</h1>
        </div>
        <div style={{width: '45px'}}></div>
      </header>

      <main className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="user-avatar neu-icon" style={{width: '100px', height: '100px', margin: 'auto', marginBottom: '20px'}}>
                {shopkeeper.photoURL ? (
                    <img src={shopkeeper.photoURL} alt={shopkeeper.displayName} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                ) : (
                    <User size={50} />
                )}
            </div>
            
            <h2 style={{color: '#3d4468', fontSize: '1.75rem', marginBottom: '10px'}}>Hello {shopkeeper.displayName}</h2>
            <p style={{color: '#9499b7', marginBottom: '30px', fontSize: '1rem'}}>
                Send a request to connect and start managing your Udhaar with this shopkeeper.
            </p>

            {requestSent ? (
                 <div style={{ padding: '20px', background: '#e0e5ec', borderRadius: '15px', boxShadow: 'inset 5px 5px 10px #bec3cf, inset -5px -5px 10px #ffffff', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <CheckCircle size={30} className="text-green-500" />
                    <div>
                        <h3 style={{color: '#3d4468', fontWeight: 600, textAlign: 'left'}}>Request Sent</h3>
                        <p style={{color: '#6c7293', margin: 0, textAlign: 'left', fontSize: '14px'}}>Redirecting to dashboard...</p>
                    </div>
                </div>
            ) : (
                <button 
                    className={`neu-button ${isProcessing ? 'loading' : ''}`} 
                    style={{margin: 0, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}
                    onClick={handleSendRequest}
                    disabled={isProcessing}
                >
                    <span className="btn-text"><Send size={18}/> Send Connection Request</span>
                    <div className="btn-loader"><div className="neu-spinner"></div></div>
                </button>
            )}

            <button className="neu-button" onClick={() => router.push('/customer/dashboard')} style={{marginTop: '20px', background: 'transparent', boxShadow: 'none'}}>
                Back to Dashboard
            </button>
        </div>
      </main>
    </div>
  );
}
