'use client';

import { useEffect, useState, useRef } from 'react';
import { QrCode, ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { useFirebase } from '@/firebase/client-provider';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { sendConnectionRequest } from '@/lib/connections';

interface ShopkeeperProfile {
    uid: string;
    displayName: string;
    connections?: string[];
}

export default function CustomerScanQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<{ shopkeeperId: string; shopkeeperName: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerMounted = useRef(false);

  useEffect(() => {
    if (readerMounted.current) return;
    readerMounted.current = true;
    
    if (!auth.currentUser || !firestore) return;

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
      if (isProcessing || scannedData) return;

      setIsProcessing(true);
      
      try {
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
        }
        
        const shopkeepersRef = collection(firestore, 'shopkeepers');
        const q = query(shopkeepersRef, where('shopkeeperCode', '==', decodedText.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'No shopkeeper found with this code.' });
          setIsProcessing(false);
          router.back();
          return;
        }

        const shopkeeperDoc = querySnapshot.docs[0];
        const shopkeeperId = shopkeeperDoc.id;
        const shopkeeperData = shopkeeperDoc.data();
        
        const customerRef = doc(firestore, 'customers', auth.currentUser!.uid);
        const customerSnap = await getDoc(customerRef);
        const customerConnections = customerSnap.data()?.connections || [];

        if (customerConnections.includes(shopkeeperId)) {
          router.push(`/customer/request-credit/${shopkeeperId}`);
        } else {
          setScannedData({ shopkeeperId: shopkeeperId, shopkeeperName: shopkeeperData.displayName });
        }

      } catch (err) {
        console.error("Error processing QR code:", err);
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Could not process the QR code. Please try again.' });
        setIsProcessing(false);
      }
    };

    const qrCodeErrorCallback = (errorMessage: string) => {
      // We can ignore 'QR code not found' errors, which are common.
    };

    const startScanning = async () => {
      try {
        await qrScanner.start({ facingMode: 'environment' }, config, qrCodeSuccessCallback, qrCodeErrorCallback);
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
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("QR Scanner stop error:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleSendConnectionRequest = async () => {
      if (!scannedData || !auth.currentUser || !firestore) return;
      
      setIsProcessing(true);
      setModalMessage(null);

      try {
          const customerSnap = await getDoc(doc(firestore, 'customers', auth.currentUser.uid));
          const customerName = customerSnap.data()?.displayName || 'A new customer';

          await sendConnectionRequest(firestore, auth.currentUser.uid, scannedData.shopkeeperId, customerName);
          setModalMessage(`Connection request sent to ${scannedData.shopkeeperName}!`);

          setTimeout(() => {
              setScannedData(null);
              setIsProcessing(false);
              router.push('/customer/dashboard');
          }, 3000);

      } catch(err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to send request.";
          setModalMessage(errorMessage);
          setIsProcessing(false);
      }
  }


  return (
    <>
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
              
              {hasCameraPermission === false && (
                  <div style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      color: 'white', background: 'rgba(0,0,0,0.7)', padding: '20px',
                      borderRadius: '15px', textAlign: 'center'
                  }}>
                      <p>Camera permission denied.</p>
                      <p style={{fontSize: '14px', opacity: 0.8}}>Please enable it in your browser settings.</p>
                  </div>
              )}

              <div style={{
                  position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                  color: 'white', background: 'rgba(0,0,0,0.6)', padding: '10px 20px',
                  borderRadius: '15px', textAlign: 'center'
              }}>
                  <p>Align QR code within the frame</p>
              </div>
          </main>
      </div>

       {scannedData && (
          <div className="modal-overlay">
              <div className="login-card modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                      <h2>Connection Request</h2>
                        <button className="close-button" onClick={() => setScannedData(null)} disabled={isProcessing}>
                          <X size={24} />
                      </button>
                  </div>

                  {modalMessage ? (
                      <>
                        <p style={{ color: '#6c7293', textAlign: 'center', marginBottom: '30px' }}>{modalMessage}</p>
                      </>
                  ) : (
                      <>
                        <p style={{ color: '#6c7293', textAlign: 'center', marginBottom: '30px' }}>
                              You are not connected to <strong>{scannedData.shopkeeperName}</strong>. Would you like to send a connection request?
                          </p>
                          <div style={{display: 'flex', gap: '20px'}}>
                              <button className="neu-button" style={{margin: 0, flex: 1, background: 'transparent', color: '#ff3b5c' }} onClick={() => setScannedData(null)} disabled={isProcessing}>
                                  Cancel
                              </button>
                              <button className={`neu-button ${isProcessing ? 'loading' : ''}`} style={{margin: 0, flex: 1, background: '#00c896', color: 'white'}} onClick={handleSendConnectionRequest} disabled={isProcessing}>
                                  <span className="btn-text">Yes, Send</span>
                                  <div className="btn-loader"><div className="neu-spinner"></div></div>
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
       )}
    </>
  );
}
