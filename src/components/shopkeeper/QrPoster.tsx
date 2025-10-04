'use client';

import Image from 'next/image';
import QRCode from "react-qr-code";

interface QrPosterProps {
    shopkeeperName: string;
    shopkeeperCode: string;
}

const WavyBackground = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, background: '#e0e5ec' }}>
        <svg
            className="waves"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 24 150 28"
            preserveAspectRatio="none"
            shapeRendering="auto"
            style={{ position: 'absolute', width: '130%', height: '180px', bottom: -20, left: '-15%' }}
        >
            <defs><path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>
            <g className="parallax">
                <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(0,200,150,0.4)" />
                <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(0,200,150,0.6)" />
                <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(0,200,150,0.8)" />
                <use xlinkHref="#gentle-wave" x="48" y="7" fill="#00c896" />
            </g>
        </svg>
    </div>
);


export default function QrPoster({ shopkeeperName, shopkeeperCode }: QrPosterProps) {

    return (
        <div style={{
            width: '420px',
            aspectRatio: '3 / 4',
            background: '#e0e5ec',
            borderRadius: '20px',
            boxShadow: '20px 20px 60px #bec3cf, -20px -20px 60px #ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Green Border */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: '#00c896', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', top: '10px', left: 0, bottom: 0, width: '10px', background: '#00c896', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', top: '10px', right: 0, bottom: 0, width: '10px', background: '#00c896', zIndex: 2 }}></div>
            
            <WavyBackground />

            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', zIndex: 1 }}>

                <div style={{ zIndex: 1, textAlign: 'center', padding: '10px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '15px', border: '2px solid #00c896', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <p style={{color: '#3d4468', margin: 0, fontSize: '15px', fontWeight: 500}}>
                        पैसे हैं तो <span style={{color: '#007BFF', fontWeight: 'bold'}}>PhonePe</span>, नहीं है तो <span style={{color: '#00c896', fontWeight: 'bold', letterSpacing: '1px'}}>Udhar Pay</span>
                    </p>
                </div>

                <div style={{ zIndex: 1, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Image src="/logo.png" alt="Udhar Pay Logo" width={40} height={40} style={{ borderRadius: '50%' }} />
                        <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Udhar Pay</h1>
                    </div>
                </div>

                <div style={{
                    zIndex: 1,
                    background: 'white',
                    padding: '20px',
                    borderRadius: '15px',
                    boxShadow: '10px 10px 30px rgba(0,0,0,0.1)',
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: '280px',
                }}>
                    <QRCode
                        value={shopkeeperCode}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                
                <div style={{ zIndex: 1, textAlign: 'center' }}>
                    <h2 style={{ color: '#3d4468', fontSize: '1.75rem', fontWeight: 600, margin: '0 0 5px 0' }}>{shopkeeperName}</h2>
                    <p style={{ color: '#00c896', fontSize: '1.25rem', fontWeight: 'bold', margin: 0, letterSpacing: '2px', background: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: '10px', display: 'inline-block' }}>
                        {shopkeeperCode}
                    </p>
                    <p style={{color: '#3d4468', marginTop: '15px', fontSize: '15px', fontWeight: 600}}>
                       उधार लेने के लिए QR CODE स्केन करे |
                    </p>
                </div>
            </div>
        </div>
    );
}
