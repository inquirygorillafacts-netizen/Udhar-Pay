'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import CustomerCard from '@/app/shopkeeper/components/CustomerCard';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  customerCode?: string;
}

interface CustomerWithBalance extends UserProfile {
    balance: number;
}

interface ShopkeeperProfile {
    defaultCreditLimit?: number;
    creditSettings?: { [key: string]: { limitType: 'default' | 'manual', manualLimit: number, isCreditEnabled: boolean } };
    connections?: string[];
}

interface Transaction {
    id: string;
    amount: number;
    type: 'credit' | 'payment';
    customerId: string;
    shopkeeperId: string;
    timestamp: Timestamp;
}

export default function ShopkeeperCustomersPage() {
  const { auth, firestore } = useFirebase();
  const [allCustomers, setAllCustomers] = useState<CustomerWithBalance[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [shopkeeperProfile, setShopkeeperProfile] = useState<ShopkeeperProfile | null>(null);

  useEffect(() => {
    if (!auth.currentUser || !firestore) {
      setLoading(false);
      return;
    }

    const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
    const unsubscribeShopkeeper = onSnapshot(shopkeeperRef, async (shopkeeperSnap) => {
        if (shopkeeperSnap.exists()) {
            const shopkeeperData = shopkeeperSnap.data() as ShopkeeperProfile;
            setShopkeeperProfile(shopkeeperData);
            const customerIds = shopkeeperData.connections || [];
            
            if (customerIds.length > 0) {
                // Fetch base profiles first
                const customersRef = collection(firestore, 'customers');
                const q = query(customersRef, where('__name__', 'in', customerIds));
                const customersSnap = await getDocs(q);
                const customerProfiles = customersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

                // Fetch all transactions to calculate balances
                const transQuery = query(collection(firestore, 'transactions'), where('shopkeeperId', '==', auth.currentUser!.uid));
                const transSnap = await getDocs(transQuery);
                const balances: {[key: string]: number} = {};
                customerIds.forEach(id => balances[id] = 0);

                transSnap.forEach(doc => {
                    const t = doc.data() as Transaction;
                    if(balances[t.customerId] !== undefined) {
                        if (t.type === 'credit') balances[t.customerId] += t.amount;
                        else if (t.type === 'payment') balances[t.customerId] -= t.amount;
                    }
                });

                const customersWithBalance = customerProfiles.map(p => ({
                    ...p,
                    balance: balances[p.uid] || 0
                }));
                
                setAllCustomers(customersWithBalance);
                setFilteredCustomers(customersWithBalance);

            } else {
                setAllCustomers([]);
                setFilteredCustomers([]);
            }
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
    });
    
    return () => unsubscribeShopkeeper();
  }, [auth.currentUser, firestore]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCustomers(allCustomers);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = allCustomers.filter(customer =>
        customer.displayName.toLowerCase().includes(lowercasedFilter) ||
        customer.customerCode?.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, allCustomers]);
  
  const getCreditLimitForCustomer = (customerId: string): number => {
    if (!shopkeeperProfile) return 1000;
    const settings = shopkeeperProfile.creditSettings?.[customerId];
    if (settings?.limitType === 'manual') {
      return settings.manualLimit;
    }
    return shopkeeperProfile.defaultCreditLimit ?? 1000;
  };
  
  const isCreditEnabledForCustomer = (customerId: string): boolean => {
      if (!shopkeeperProfile) return true; // Default to enabled
      const settings = shopkeeperProfile.creditSettings?.[customerId];
      return settings?.isCreditEnabled ?? true;
  }

  return (
    <main className="dashboard-main-content" style={{padding: '20px'}}>
        <div className="login-card" style={{ maxWidth: '600px', margin: 'auto', marginBottom: '30px' }}>
             <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
                    <div className="neu-input">
                    <input
                        type="text"
                        id="search"
                        placeholder=" "
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <label htmlFor="search">Search by Name or Code</label>
                    <div className="input-icon"><Search /></div>
                    </div>
                </div>

                <div className="token-balance" style={{ margin: 0, padding: '10px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{allCustomers.length}</span>
                    </div>
                     <span style={{ fontSize: '12px', color: '#6c7293', fontWeight: 500, marginTop: '2px' }}>Customers</span>
                </div>
            </div>
        </div>
      
        {loading ? (
            <div className="loading-container" style={{minHeight: '200px'}}>
                <div className="neu-spinner"></div>
                <p style={{marginTop: '20px', color: '#6c7293'}}>Loading customers...</p>
            </div>
        ) : allCustomers.length === 0 ? (
            <div className="login-card" style={{maxWidth: '600px', margin: 'auto', textAlign: 'center'}}>
                <h2 style={{color: '#3d4468', fontSize: '1.5rem', fontWeight: '600', marginBottom: '15px'}}>No Customers Connected</h2>
                <p style={{color: '#9499b7'}}>Share your shop code with customers so they can connect with you.</p>
            </div>
        ) : filteredCustomers.length === 0 ? (
            <p style={{ color: '#6c7293', textAlign: 'center', marginTop: '1rem' }}>
            No customers found matching your search.
            </p>
        ) : (
            <div style={{ maxWidth: '600px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredCustomers.map(customer => (
                    <Link key={customer.uid} href={`/shopkeeper/customer/${customer.uid}`} style={{textDecoration: 'none'}}>
                        <CustomerCard 
                            customer={{...customer, balances: {[auth.currentUser!.uid]: customer.balance}}} 
                            shopkeeperId={auth.currentUser!.uid}
                            creditLimit={getCreditLimitForCustomer(customer.uid)}
                            isCreditEnabled={isCreditEnabledForCustomer(customer.uid)}
                        />
                    </Link>
                ))}
            </div>
        )}
    </main>
  );
}
