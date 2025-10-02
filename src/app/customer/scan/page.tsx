'use client';

import { useEffect, useState, useRef } from 'react';
import { QrCode, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';


export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // We will create a new instance of the scanner
    const scanner = new Html5Qrcode('reader');

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250,
      },
    };

    const success = (decodedText: string, decodedResult: any) => {
      // For now, we will just log the result.
      // In the future, we would validate the shopkeeper code and redirect.
      alert(`Scanned Shopkeeper Code: ${decodedText}`);
      scanner.clear();
      // Example redirect:
      // router.push(`/customer/payment/${decodedText}`);
    };

    const error = (err: any) => {
      // We can ignore QR Not Found errors, as they are very frequent.
      if (!err.includes("NotFoundException")) {
        console.error(err);
      }
    };
    
     const startScanning = async () => {
        try {
            await scanner.start({ facingMode: 'environment' }, config, success, error);
            setHasCameraPermission(true);
        } catch (err) {
            console.error("Camera start error:", err);
            setHasCameraPermission(false);
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
      // Cleanup function to stop the scanner, otherwise it will keep scanning.
      if (scanner.isScanning) {
          scanner.stop().catch(err => console.error("Scanner stop error:", err));
      }
    };
  }, [router, toast]);


  return (
    <div style={{ height: '100vh', background: '#333', display: 'flex', flexDirection: 'column' }}>
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
            <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
                <ArrowLeft size={20} />
            </button>
            <div style={{textAlign: 'center', flexGrow: 1}}>
                <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>Scan Shopkeeper QR</h1>
            </div>
            <div style={{width: '45px', flexShrink: 0}}></div>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div id="reader" style={{ width: '100%', height: '100%', background: 'black' }}></div>
            
            {hasCameraPermission === false && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '20px',
                    borderRadius: '15px',
                    textAlign: 'center'
                }}>
                    <p>Camera permission denied.</p>
                    <p style={{fontSize: '14px', opacity: 0.8}}>Please enable it in your browser settings.</p>
                </div>
            )}

            <div style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                background: 'rgba(0,0,0,0.6)',
                padding: '10px 20px',
                borderRadius: '15px',
                textAlign: 'center'
            }}>
                <p>Align QR code within the frame</p>
            </div>
        </main>
    </div>
  );
}
