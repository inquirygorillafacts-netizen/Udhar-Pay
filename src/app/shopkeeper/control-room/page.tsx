'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Save, IndianRupee, AlertTriangle, Phone, User, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const MIN_LIMIT = 250;
const MAX_LIMIT = 5000;

interface CustomerProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
}

interface CustomerLimit {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  limit: number;
}


export default function ShopControlRoomPage() {
    const { auth, firestore } = useFirebase();
    const router = useRouter();
    
    // Default limit state
    const [defaultCreditLimit, setDefaultCreditLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // Modals state
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showMaxLimitModal, setShowMaxLimitModal] = useState(false);

    // Customer specific limits state
    const [customers, setCustomers] = useState<CustomerLimit[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<CustomerLimit[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [savingStates, setSavingStates] = useState<{[key: string]: boolean}>({});


    useEffect(() => {
        if (!auth.currentUser) return;
        
        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        getDoc(shopkeeperRef).then(async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const limit = data.defaultCreditLimit === undefined ? 1000 : data.defaultCreditLimit;
                setDefaultCreditLimit(limit.toString());

                // Fetch connected customers
                const customerIds = data.connections || [];
                if (customerIds.length > 0) {
                    const customersRef = collection(firestore, 'customers');
                    const q = query(customersRef, where('__name__', 'in', customerIds));
                    const customersSnap = await getDocs(q);
                    
                    const customerProfiles = customersSnap.docs.map(doc => ({ 
                        uid: doc.id, 
                        displayName: doc.data().displayName,
                        photoURL: doc.data().photoURL,
                        limit: data.customerLimits?.[doc.id] ?? limit // Use specific or default
                    } as CustomerLimit));

                    setCustomers(customerProfiles);
                    setFilteredCustomers(customerProfiles);
                } else {
                     setCustomers([]);
                     setFilteredCustomers([]);
                }
            } else {
                 setDefaultCreditLimit('1000');
                 setCustomers([]);
                 setFilteredCustomers([]);
            }
            setLoading(false);
            setLoadingCustomers(false);
        }).catch(err => {
            console.error("Error fetching shopkeeper settings:", err);
            setError("सेटिंग्स लोड करने में विफल। कृपया पुनः प्रयास करें।");
            setLoading(false);
            setLoadingCustomers(false);
        });
    }, [auth.currentUser, firestore]);
    
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredCustomers(customers);
        } else {
            const lowercasedFilter = searchTerm.toLowerCase();
            const filtered = customers.filter(customer =>
                customer.displayName.toLowerCase().includes(lowercasedFilter)
            );
            setFilteredCustomers(filtered);
        }
    }, [searchTerm, customers]);


    const handleValidationAndSave = () => {
        const newLimit = parseFloat(defaultCreditLimit);
        setError('');

        if (isNaN(newLimit) || newLimit < 0) {
            setError("कृपया एक मान्य उधार सीमा दर्ज करें।");
            return;
        }

        if (newLimit < MIN_LIMIT) {
             setError(`उधार सीमा ₹${MIN_LIMIT} से कम नहीं हो सकती।`);
             return;
        }

        if (newLimit > MAX_LIMIT) {
            setShowMaxLimitModal(true);
            return;
        }
        
        setShowWarningModal(true);
    };
    
    const handleSaveDefaultLimit = async () => {
        if (!auth.currentUser) {
            setError("आपको इस क्रिया के लिए लॉग इन होना चाहिए।");
            return;
        }
        setShowWarningModal(false);
        const limit = parseFloat(defaultCreditLimit);
        
        if (isNaN(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
            setError("अमान्य सीमा। कृपया ₹250 और ₹5000 के बीच की राशि दर्ज करें।");
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
            await updateDoc(shopkeeperRef, { defaultCreditLimit: limit });
            
            setSuccessMessage("डिफ़ॉल्ट उधार सीमा सफलतापूर्वक सेव हो गई है!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error("Error saving settings:", err);
            setError("सेटिंग्स सेव करने में विफल। कृपया पुनः प्रयास करें।");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCustomerLimitChange = (customerId: string, newLimitValue: string) => {
        const newLimit = parseFloat(newLimitValue);
        
        const updateCustomerState = (customersList: CustomerLimit[]) => 
            customersList.map(c => 
                c.uid === customerId 
                    ? { ...c, limit: isNaN(newLimit) ? 0 : newLimit } 
                    : c
            );

        setFilteredCustomers(updateCustomerState);
        setCustomers(updateCustomerState);
    };


    const handleSaveCustomerLimit = async (customerId: string) => {
        if(!auth.currentUser) return;
        
        const customer = customers.find(c => c.uid === customerId);
        if (!customer) return;

        const newLimit = customer.limit;
        if (isNaN(newLimit) || newLimit < 0) {
            alert("Please enter a valid limit.");
            return;
        }

        setSavingStates(prev => ({...prev, [customerId]: true}));

        try {
            const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
            await updateDoc(shopkeeperRef, {
                [`customerLimits.${customerId}`]: newLimit
            });
             alert(`Limit for ${customer.displayName} updated to ₹${newLimit}`);
        } catch(err) {
            console.error("Failed to save customer limit:", err);
            alert("Failed to save limit. Please try again.");
        } finally {
            setSavingStates(prev => ({...prev, [customerId]: false}));
        }
    };
    
    if (loading) {
        return <div className="loading-container"><div className="neu-spinner"></div></div>;
    }

    return (
        <>
           {showWarningModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="neu-icon" style={{background: '#ffc107', color: 'white', margin: '0 15px 0 0', width: '60px', height: '60px'}}><AlertTriangle size={30}/></div>
                            <h2 style={{fontSize: '1.5rem'}}>Warning</h2>
                        </div>
                        <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '25px', lineHeight: 1.7}}>
                           आप अपनी डिफ़ॉल्ट उधार सीमा ₹{defaultCreditLimit} पर सेट कर रहे हैं। इससे आपके नए ग्राहकों के लिए उधार का जोखिम बढ़ सकता है। क्या आप निश्चित हैं?
                        </p>
                        <div style={{display: 'flex', gap: '20px'}}>
                            <button className="neu-button" onClick={() => setShowWarningModal(false)} style={{margin:0, flex: 1}}>Cancel</button>
                            <button className={`neu-button ${isSaving ? 'loading' : ''}`} onClick={handleSaveDefaultLimit} disabled={isSaving} style={{margin:0, flex: 1, background: '#00c896', color: 'white'}}>
                                <span className="btn-text">Yes, I'm sure</span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {showMaxLimitModal && (
                <div className="modal-overlay">
                    <div className="login-card modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="neu-icon" style={{background: '#ff3b5c', color: 'white', margin: '0 15px 0 0', width: '60px', height: '60px'}}><AlertTriangle size={30}/></div>
                            <h2 style={{fontSize: '1.5rem'}}>Limit Exceeded</h2>
                        </div>
                        <p style={{color: '#6c7293', textAlign: 'center', marginBottom: '25px', lineHeight: 1.7}}>
                           उधार सीमा ₹{MAX_LIMIT} से ज़्यादा नहीं हो सकती। यदि आपको इससे ज़्यादा की सीमा की आवश्यकता है, तो कृपया हमारी टीम से संपर्क करें।
                        </p>
                         <a href="tel:8302806913" className="neu-button" style={{margin: 0, background: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <Phone size={18}/> टीम से बात करें
                        </a>
                        <button className="neu-button" onClick={() => setShowMaxLimitModal(false)} style={{margin: '15px 0 0 0'}}>Close</button>
                    </div>
                </div>
            )}
            
            <div>
                <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 10, borderRadius: '0 0 20px 20px' }}>
                    <button onClick={() => router.back()} className="neu-button" style={{width: '45px', height: '45px', padding: 0, margin: 0, flexShrink: 0}}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{textAlign: 'center', flexGrow: 1}}>
                        <h1 style={{color: '#3d4468', fontSize: '1.2rem', fontWeight: '600'}}>दुकान कंट्रोल रूम</h1>
                    </div>
                    <div style={{width: '45px'}}></div>
                </header>

                <main className="dashboard-main-content" style={{padding: '20px'}}>
                    <div className="login-card" style={{maxWidth: '600px', margin: 'auto', marginBottom: '40px'}}>
                        <div className="setting-section">
                            <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1.2rem'}}>डिफ़ॉल्ट ग्राहक उधार सीमा</h3>
                            <p style={{color: '#9499b7', textAlign: 'center', marginTop: '-10px', marginBottom: '30px'}}>
                                नए ग्राहकों के लिए एक डिफ़ॉल्ट उधार सीमा निर्धारित करें। न्यूनतम ₹{MIN_LIMIT} और अधिकतम ₹{MAX_LIMIT}।
                            </p>
                            
                            <div className="form-group">
                                <div className="neu-input">
                                    <input type="number" id="credit-limit" value={defaultCreditLimit} onChange={(e) => setDefaultCreditLimit(e.target.value)} placeholder=" " required />
                                    <label htmlFor="credit-limit">डिफ़ॉल्ट उधार सीमा (₹)</label>
                                    <div className="input-icon"><IndianRupee /></div>
                                </div>
                            </div>
                            {error && <p className="error-message show" style={{textAlign: 'center', marginLeft: 0}}>{error}</p>}
                            {successMessage && <p style={{color: '#00c896', textAlign: 'center', fontWeight: 500}}>{successMessage}</p>}

                            <button className={`neu-button ${isSaving ? 'loading' : ''}`} onClick={handleValidationAndSave} disabled={isSaving} style={{marginTop: '20px'}}>
                                <span className="btn-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><Save size={20} />सेटिंग्स सेव करें</span>
                                <div className="btn-loader"><div className="neu-spinner"></div></div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="login-card" style={{maxWidth: '600px', margin: 'auto'}}>
                        <div className="setting-section">
                             <h3 className="setting-title" style={{textAlign: 'center', border: 'none', fontSize: '1.2rem'}}>ग्राहक अनुसार उधार सीमा</h3>
                              <p style={{color: '#9499b7', textAlign: 'center', marginTop: '-10px', marginBottom: '30px'}}>
                                हर ग्राहक के लिए एक विशेष उधार सीमा सेट करें। यदि कोई विशेष सीमा सेट नहीं है, तो डिफ़ॉल्ट सीमा लागू होगी।
                            </p>
                            <div className="form-group" style={{marginBottom: '30px'}}>
                                <div className="neu-input">
                                    <input type="text" id="search-customer" placeholder=" " value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    <label htmlFor="search-customer">ग्राहक खोजें...</label>
                                    <div className="input-icon"><Search /></div>
                                </div>
                            </div>

                            {loadingCustomers ? <div className="neu-spinner" style={{margin: 'auto'}}></div> : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                                    {filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                                        <div key={cust.uid} className="neu-input" style={{padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'none'}}>
                                            <div className="neu-icon" style={{width: '45px', height: '45px', margin: 0}}>
                                                {cust.photoURL ? <Image src={cust.photoURL} alt={cust.displayName} width={45} height={45} style={{borderRadius: '50%', objectFit: 'cover'}}/> : <User size={20} />}
                                            </div>
                                            <div style={{flex: 1}}>
                                                <p style={{color: '#3d4468', fontWeight: 600}}>{cust.displayName}</p>
                                                <p style={{color: '#6c7293', fontSize: '12px'}}>लागू लिमिट: ₹{customers.find(c => c.uid === cust.uid)?.limit ?? defaultCreditLimit}</p>
                                            </div>
                                            <div style={{width: '120px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                 <div className="form-group" style={{margin: 0, flex: 1}}>
                                                    <div className="neu-input" style={{borderRadius: '10px'}}>
                                                        <input type="number" value={customers.find(c => c.uid === cust.uid)?.limit || ''} onChange={(e) => handleCustomerLimitChange(cust.uid, e.target.value)} style={{padding: '10px', fontSize: '14px', textAlign: 'center'}} placeholder="Limit" />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleSaveCustomerLimit(cust.uid)} className={`neu-button ${savingStates[cust.uid] ? 'loading' : ''}`} style={{width: '40px', height: '40px', padding: 0, margin: 0, flexShrink: 0}} disabled={savingStates[cust.uid]}>
                                                    <span className="btn-text"><Save size={16}/></span>
                                                    <div className="btn-loader"><div className="neu-spinner" style={{width: '16px', height: '16px'}}></div></div>
                                                </button>
                                            </div>
                                        </div>
                                    )) : <p style={{textAlign: 'center', color: '#9499b7'}}>कोई ग्राहक नहीं मिला।</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
