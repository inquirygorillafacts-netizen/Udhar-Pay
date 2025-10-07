'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Flashlight, CameraOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';


export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const stopScanner = useCallback(() => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        try {
            scannerRef.current.stop().catch(err => {
              // Errors on stop are common and can be ignored.
            });
        } catch (e) {
            // Can ignore this too
        }
        scannerRef.current = null;
        setIsScanning(false);
    }
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      stopScanner();

      try {
          if (!auth.currentUser || !firestore) throw new Error("Authentication context not available.");

          const shopkeeperCode = decodedText;
          const shopkeepersRef = collection(firestore, 'shopkeepers');
          const q = query(shopkeepersRef, where('shopkeeperCode', '==', shopkeeperCode.toUpperCase()));
          const shopkeeperSnapshot = await getDocs(q);

          if (shopkeeperSnapshot.empty) {
              throw new Error("Invalid QR Code. No shopkeeper found.");
          }

          const shopkeeperDoc = shopkeeperSnapshot.docs[0];
          const shopkeeperId = shopkeeperDoc.id;

          const customerRef = doc(firestore, 'customers', auth.currentUser.uid);
          const customerSnap = await getDoc(customerRef);
          const customerConnections = customerSnap.data()?.connections || [];

          if (customerConnections.includes(shopkeeperId)) {
              router.push(`/customer/request-credit/${shopkeeperId}`);
          } else {
              router.push(`/customer/connect/${shopkeeperId}`);
          }
      } catch (err: any) {
          toast({ variant: 'destructive', title: 'Scan Error', description: err.message || 'Could not process QR code.' });
          setTimeout(() => router.back(), 2000);
      }
  }, [auth.currentUser, firestore, router, stopScanner, toast]);
  
  
  useEffect(() => {
      // Ensure this only runs on the client
      if (typeof window === 'undefined' || document.getElementById('reader') === null) return;
      
      const qrScanner = new Html5Qrcode('reader');
      scannerRef.current = qrScanner;

      const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.7);
              return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1.0,
          supportedScanTypes: [],
      };
      
      const qrCodeErrorCallback = (errorMessage: string) => { /* Ignore common errors */ };
      
      qrScanner.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          qrCodeErrorCallback
      ).then(() => {
          setIsScanning(true);
          try {
              // @ts-ignore - _getRunningTrack() is an internal but useful method
              const track = qrScanner._getRunningTrack();
              const capabilities = track.getCapabilities();
              // Deeper check: Ensure both 'torch' capability and 'applyConstraints' method are supported.
              if (capabilities && typeof capabilities.torch === 'boolean' && typeof track.applyConstraints === 'function') {
                  setIsTorchAvailable(true);
              } else {
                  setIsTorchAvailable(false);
              }
          } catch (e) {
              setIsTorchAvailable(false);
          }
      }).catch(err => {
           if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setShowPermissionModal(true);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Camera Error',
                    description: 'Could not start the camera. It might be in use by another app.',
                });
            }
      });

      return () => {
          stopScanner();
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    if (!isTorchAvailable || !scannerRef.current || scannerRef.current.getState() !== Html5QrcodeScannerState.SCANNING) {
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
        setIsTorchAvailable(false); // Disable if it fails once
        toast({
            variant: 'destructive',
            title: 'Torch Error',
            description: 'Could not control the flashlight on this device.',
        });
    }
  };

  return (
    <>
      {showPermissionModal && (
        <div className="modal-overlay" onClick={() => { setShowPermissionModal(false); router.back(); }}>
            <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{flexDirection: 'column', textAlign: 'center', marginBottom: '25px'}}>
                    <div className="neu-icon" style={{width: '70px', height: '70px', background: '#ffdfe4'}}>
                        <CameraOff size={30} className="text-red-500"/>
                    </div>
                    <h2 style={{color: '#3d4468', fontSize: '1.5rem', marginBottom: '0', marginTop: '15px'}}>कैमरा अनुमति आवश्यक है</h2>
                </div>
                <p style={{color: '#9499b7', marginBottom: '30px', fontSize: '1rem', textAlign: 'center'}}>
                    QR कोड स्कैन करने के लिए, आपको अपनी ब्राउज़र सेटिंग्स में इस साइट के लिए कैमरा एक्सेस की अनुमति देनी होगी।
                </p>
                <button className="neu-button" onClick={() => router.back()} style={{margin: 0}}>
                   Go Back
                </button>
            </div>
        </div>
      )}

      <div style={{ height: '100svh', background: '#e0e5ec', display: 'flex', flexDirection: 'column' }}>
          <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
              <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
                      {isScanning ? (
                          <div className="qr-scanner-frame">
                              <div className="scanner-corner top-left"></div>
                              <div className="scanner-corner top-right"></div>
                              <div className="scanner-corner bottom-left"></div>
                              <div className="scanner-corner bottom-right"></div>
                              <div className="scanner-line"></div>
                          </div>
                      ) : (
                         !showPermissionModal && <div className="neu-spinner" style={{position: 'absolute'}}></div>
                      )}
              </div>
          </main>
          
          <div style={{
              color: '#6c7293', background: '#e0e5ec', padding: '10px 20px 20px',
              textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
          }}>
           {isScanning && isTorchAvailable && (
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
           )}
          <p style={{margin:0, fontWeight: 500}}>Align QR code within the frame</p>
      </div>
      </div>
    </>
  );
}
