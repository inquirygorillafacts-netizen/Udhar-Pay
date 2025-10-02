'use client';

import Image from 'next/image';
import { CreditCard, Phone, Bookmark, IndianRupee } from 'lucide-react';

const creditCardProducts = [
    {
        id: 1,
        name: 'Platinum Advantage Card',
        description: 'Ideal for frequent travelers, offering lounge access and travel rewards.',
        joiningFee: 1499,
        imageUrl: 'https://picsum.photos/seed/cc1/600/400',
        features: ['Airport Lounge Access', '5X Reward Points on Travel', 'Zero Forex Markup'],
        imageHint: "platinum credit card"
    },
    {
        id: 2,
        name: 'Gold Cashback Card',
        description: 'Get guaranteed cashback on all your online and offline spends.',
        joiningFee: 499,
        imageUrl: 'https://picsum.photos/seed/cc2/600/400',
        features: ['5% Cashback on Online Shopping', '1% Cashback on All Spends', 'Easy EMI Options'],
         imageHint: "gold credit card"
    },
    {
        id: 3,
        name: 'Millennial\'s First Card',
        description: 'A lifetime-free card designed for students and young professionals.',
        joiningFee: 0,
        imageUrl: 'https://picsum.photos/seed/cc3/600/400',
        features: ['Lifetime Free', 'Exclusive Movie Ticket Offers', 'Discounts on Dining'],
         imageHint: "modern credit card"
    },
     {
        id: 4,
        name: 'Business Elite Card',
        description: 'Powerful card for business owners with higher credit limits and expense management tools.',
        joiningFee: 4999,
        imageUrl: 'https://picsum.photos/seed/cc4/600/400',
        features: ['Higher Credit Limit', 'Expense Management Software', 'Business Travel Insurance'],
        imageHint: "business credit card"
    },
];


export default function SellCreditCardPage() {

    const handleBookNow = (cardName: string) => {
        // In the future, this would open a form or a modal to capture customer details.
        alert(`Booking process for ${cardName} will be implemented soon.`);
    }

    return (
        <main className="dashboard-main-content" style={{ padding: '20px' }}>
            <div className="login-card" style={{ maxWidth: '800px', margin: 'auto' }}>
                <div className="login-header" style={{marginBottom: '40px'}}>
                    <div className="neu-icon" style={{width: '70px', height: '70px'}}>
                        <div className="icon-inner"><CreditCard/></div>
                    </div>
                    <h1 style={{ color: '#3d4468', fontSize: '2rem', fontWeight: '600' }}>
                        Credit Card Marketplace
                    </h1>
                    <p style={{ color: '#6c7293', marginTop: '1rem' }}>
                        List and manage credit cards available for customers.
                    </p>
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
                                        <Phone size={16}/> Call
                                     </a>
                                     <button onClick={() => handleBookNow(card.name)} className="neu-button" style={{margin: 0, flex: 1, background: '#00c896', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '12px'}}>
                                        <Bookmark size={16}/> Book Now
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
