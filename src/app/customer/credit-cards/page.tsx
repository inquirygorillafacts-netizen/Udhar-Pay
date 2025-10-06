'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, Phone, CheckCircle, IndianRupee, LandPlot } from 'lucide-react';

const creditCardProducts = [
    {
        id: 1,
        name: 'Platinum Advantage Card',
        description: 'Ideal for frequent travelers, offering lounge access and travel rewards.',
        joiningFee: 1499,
        imageUrl: 'https://picsum.photos/seed/cc1/600/400',
        imageHint: "platinum credit card"
    },
    {
        id: 2,
        name: 'Gold Cashback Card',
        description: 'Get guaranteed cashback on all your online and offline spends.',
        joiningFee: 499,
        imageUrl: 'https://picsum.photos/seed/cc2/600/400',
         imageHint: "gold credit card"
    },
    {
        id: 3,
        name: 'Millennial\'s First Card',
        description: 'A lifetime-free card designed for students and young professionals.',
        joiningFee: 0,
        imageUrl: 'https://picsum.photos/seed/cc3/600/400',
         imageHint: "modern credit card"
    },
     {
        id: 4,
        name: 'Business Elite Card',
        description: 'Powerful card for business owners with higher credit limits and expense management tools.',
        joiningFee: 4999,
        imageUrl: 'https://picsum.photos/seed/cc4/600/400',
        imageHint: "business credit card"
    },
];


export default function CustomerCreditCardsPage() {

    const handleApplyNow = (cardName: string) => {
        // In a real app, this would open a detailed application form or a multi-step modal.
        alert(`Your application for ${cardName} has been submitted! Our team will contact you shortly.`);
    }

    return (
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
                
                 {/* Loan Banner */}
                <div className="login-card" style={{ margin: '0 0 40px 0', padding: '30px', background: '#007bff', color: 'white' }}>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4">
                        <div className="text-center md:text-left">
                            <h2 style={{color: 'white', fontSize: '1.5rem', fontWeight: 'bold', margin: '0'}}>Get Easy & Fast Loans</h2>
                        </div>
                        <div className="w-full md:w-auto">
                         <Link href="/loan/apply" className="neu-button" style={{margin: 0, background: 'transparent', color: 'white', flexShrink: 0, width: '100%', border: '2px solid white', boxShadow: 'none'}}>
                           Apply Now
                        </Link>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    {creditCardProducts.map(card => (
                        <div key={card.id} className="login-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', boxShadow: '10px 10px 30px #bec3cf, -10px -10px 30px #ffffff' }}>
                            <div style={{position: 'relative', width: '100%', height: '180px', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', overflow: 'hidden'}}>
                                <Image 
                                    src={card.imageUrl} 
                                    alt={card.name} 
                                    fill
                                    style={{objectFit: 'cover'}}
                                    data-ai-hint={card.imageHint}
                                />
                            </div>

                            <div style={{padding: '25px', display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                                <h3 style={{color: '#3d4468', fontSize: '1.25rem', fontWeight: 600, marginBottom: '10px'}}>{card.name}</h3>
                                <p style={{color: '#9499b7', fontSize: '14px', flexGrow: 1, marginBottom: '20px'}}>{card.description}</p>
                                
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px'}}>
                                    <span style={{color: '#6c7293', fontSize: '14px', fontWeight: 500}}>Joining Fee</span>
                                     <span style={{display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: '#3d4468'}}>
                                        <IndianRupee size={18} style={{marginRight: '2px'}}/> 
                                        {card.joiningFee.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                
                                <div style={{display: 'flex', gap: '15px'}}>
                                     <a href="tel:7073077195" className="neu-button" style={{margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                        <Phone size={16}/> Inquiry
                                     </a>
                                     <button onClick={() => handleApplyNow(card.name)} className="neu-button" style={{margin: 0, flex: 1.2, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                        <CheckCircle size={16}/> Apply Now
                                     </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
