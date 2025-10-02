'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

export default function ShopkeeperCustomersPage() {
  const { auth, firestore } = useFirebase();
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [shopkeeperProfile, setShopkeeperProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser || !firestore) {
      setLoading(false);
      return;
    }

    const fetchShopkeeperAndCustomers = async () => {
      try {
        const shopkeeperRef = doc(firestore, 'shopkeepers', auth.currentUser.uid);
        const shopkeeperSnap = await getDoc(shopkeeperRef);

        if (shopkeeperSnap.exists()) {
          const shopkeeperData = shopkeeperSnap.data();
          setShopkeeperProfile(shopkeeperData);
          const customerIds = shopkeeperData.connections || [];
          
          if (customerIds.length > 0) {
            const customersRef = collection(firestore, 'customers');
            const q = query(customersRef, where('__name__', 'in', customerIds));
            const customersSnap = await getDocs(q);
            
            const customerProfiles = customersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

            setAllCustomers(customerProfiles);
            setFilteredCustomers(customerProfiles);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopkeeperAndCustomers();
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
                            customer={customer} 
                            balance={shopkeeperProfile?.balances?.[customer.uid] || 0}
                        />
                    </Link>
                ))}
            </div>
        )}
    </main>
  );
}
