'use client';

import { useEffect, useState, useRef } from 'react';
import { QrCode, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // We will uncomment and implement this logic in a future step
  /*
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to scan QR codes.',
        });
        // Redirect back after showing the toast
        setTimeout(() => router.back(), 3000);
      }
    };

    getCameraPermission();

    return () => {
      // Stop the camera stream when the component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [router, toast]);
  */

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
            {/* Camera feed will go here */}
            <div style={{ width: '100%', height: '100%', background: '#000' }}>
                 {/* <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline /> */}
            </div>

            {/* QR Code Scanner Overlay */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(70vw, 300px)',
                height: 'min(70vw, 300px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    height: '100%',
                    border: '4px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '24px',
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)',
                }}/>
                <QrCode size={60} color="white" style={{ zIndex: 1, opacity: 0.5 }} />
            </div>

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
                 <p style={{ fontSize: '12px', opacity: 0.8 }}>Coming Soon!</p>
            </div>
        </main>
    </div>
  );
}
