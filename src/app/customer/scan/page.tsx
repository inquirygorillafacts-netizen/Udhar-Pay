'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flashlight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useFirebase } from '@/firebase/client-provider';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';


export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerMounted = useRef(false);
  const isProcessingRef = useRef(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(true);

  // Function to toggle the torch
  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      if (!isTorchAvailable) {
         toast({
            variant: 'destructive',
            title: 'Torch Not Supported',
            description: 'Your device does not support flashlight control from the browser.',
        });
        return;
      }
      try {
        const newTorchState = !isTorchOn;
        // @ts-ignore - _getRunningTrack() is an internal but useful method
        const track = scannerRef.current._getRunningTrack(); 
        await track.applyConstraints({
            advanced: [{ torch: newTorchState }]
        });
        setIsTorchOn(newTorchState);
      } catch (err) {
        console.error("Error toggling torch:", err);
        toast({
            variant: 'destructive',
            title: 'Torch Error',
            description: 'Could not control the flashlight.',
        });
      }
    }
  };


  useEffect(() => {
    if (readerMounted.current || !auth.currentUser || !firestore) return;
    readerMounted.current = true;
    
    const qrScanner = new Html5Qrcode('reader');
    scannerRef.current = qrScanner;

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.7);
        return {
            width: qrboxSize,
            height: qrboxSize,
        };
      },
      aspectRatio: 1.0,
      supportedScanTypes: [],
    };

    const qrCodeSuccessCallback = async (decodedText: string) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
  
        try {
          if (scannerRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
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
        await qrScanner.start(
          { facingMode: 'environment' }, 
          config, 
          qrCodeSuccessCallback, 
          qrCodeErrorCallback
        );
        
        // After starting, check for torch capability
        try {
          // @ts-ignore
          const track = qrScanner._getRunningTrack();
          const capabilities = track.getCapabilities();
          if (!capabilities.torch) {
            setIsTorchAvailable(false);
          }
        } catch (e) {
          setIsTorchAvailable(false);
          console.log('Torch capability check failed.', e);
        }

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
    <div style={{ height: '100svh', background: '#e0e5ec', display: 'flex', flexDirection: 'column' }}>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
            <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <ArrowLeft size={20} />
            </button>
            <div style={{textAlign: 'center', flexGrow: 1}}>
                <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Scan Shopkeeper QR</h1>
            </div>
            <div style={{width: '45px', flexShrink: 0}}></div>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
            <div className="qr-scanner-container">
                <div id="reader" style={{ width: '100%', height: '100%', borderRadius: '25px', overflow: 'hidden' }}></div>
                <div className="qr-scanner-frame">
                    <div className="scanner-corner top-left"></div>
                    <div className="scanner-corner top-right"></div>
                    <div className="scanner-corner bottom-left"></div>
                    <div className="scanner-corner bottom-right"></div>
                    <div className="scanner-line"></div>
                </div>
            </div>
        </main>
        
        <div style={{
                color: '#6c7293', background: '#e0e5ec', padding: '10px 20px 20px',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
            }}>
             <button 
                onClick={toggleTorch} 
                className={`neu-button ${isTorchOn ? 'active' : ''}`}
                style={{ 
                    width: 'auto', 
                    padding: '12px 25px',
                    margin: 0,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px'
                }}
            >
                <Flashlight size={20} />
                <span>{isTorchOn ? 'Torch On' : 'Torch Off'}</span>
            </button>
            <p style={{margin:0, fontWeight: 500}}>Align QR code within the frame</p>
        </div>
    </div>
  );
}
