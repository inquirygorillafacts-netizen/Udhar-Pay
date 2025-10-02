'use client';

import { useEffect, useRef } from 'react';
import { QrCode, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { useFirebase } from '@/firebase/client-provider';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';


export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerMounted = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (readerMounted.current || !auth.currentUser || !firestore) return;
    readerMounted.current = true;
    
    const qrScanner = new Html5Qrcode('reader');
    scannerRef.current = qrScanner;

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250,
      },
       aspectRatio: 1.0,
    };

    const qrCodeSuccessCallback = async (decodedText: string) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
  
        try {
          if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
          }
          
          const shopkeeperCode = decodedText;

          // 1. Find shopkeeper by code
          const shopkeepersRef = collection(firestore, 'shopkeepers');
          const q = query(shopkeepersRef, where('shopkeeperCode', '==', shopkeeperCode.toUpperCase()));
          const shopkeeperSnapshot = await getDocs(q);

          if (shopkeeperSnapshot.empty) {
              throw new Error("Invalid QR Code. No shopkeeper found.");
          }

          const shopkeeperDoc = shopkeeperSnapshot.docs[0];
          const shopkeeperId = shopkeeperDoc.id;

          // 2. Check if customer is already connected
          const customerRef = doc(firestore, 'customers', auth.currentUser!.uid);
          const customerSnap = await getDoc(customerRef);
          const customerConnections = customerSnap.data()?.connections || [];

          if (customerConnections.includes(shopkeeperId)) {
              // Already connected, go to request credit page
              router.push(`/customer/request-credit/${shopkeeperId}`);
          } else {
              // Not connected, go to the new connect page
              router.push(`/customer/connect/${shopkeeperId}`);
          }
  
        } catch (err: any) {
            toast({ 
              variant: 'destructive', 
              title: 'Scan Error', 
              description: err.message || 'Could not process the QR code. Please try again.' 
            });
            // Adding a small delay before going back to allow the user to see the toast
            setTimeout(() => router.back(), 2000);
        }
      };

    const qrCodeErrorCallback = (errorMessage: string) => {
      // We can ignore 'QR code not found' errors, which are common.
    };

    const startScanning = async () => {
      try {
        await qrScanner.start({ facingMode: 'environment' }, config, qrCodeSuccessCallback, qrCodeErrorCallback);
      } catch (err) {
        console.error("Camera start error:", err);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to scan QR codes.',
        });
        setTimeout(() => router.back(), 3000);
      }
    };

    startScanning();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("QR Scanner stop error:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.currentUser, firestore]);

  return (
    <div style={{ height: '100vh', background: '#333', display: 'flex', flexDirection: 'column' }}>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px', background: 'rgba(224, 229, 236, 0.9)', backdropFilter: 'blur(5px)' }}>
            <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
                <ArrowLeft size={20} />
            </button>
            <div style={{textAlign: 'center', flexGrow: 1}}>
                <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Scan Shopkeeper QR</h1>
            </div>
            <div style={{width: '45px', flexShrink: 0}}></div>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div id="reader" style={{ width: '100vw', height: '100%' }}></div>
            
            <div style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                color: 'white', background: 'rgba(0,0,0,0.6)', padding: '10px 20px',
                borderRadius: '15px', textAlign: 'center'
            }}>
                <p>Align QR code within the frame</p>
            </div>
        </main>
    </div>
  );
}
