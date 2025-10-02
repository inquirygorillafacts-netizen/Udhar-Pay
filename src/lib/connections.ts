import { doc, writeBatch, type Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';

interface ConnectionRequestPayload {
  requestId: string;
  customerId: string;
  shopkeeperId: string;
}

interface ConnectionResult {
    status: 'request_sent' | 'already_connected';
    shopkeeper?: {
        id: string;
        name: string;
    }
}

export const sendConnectionRequest = async (firestore: Firestore, customerId: string, shopkeeperIdentifier: string, customerName: string): Promise<ConnectionResult> => {
    // 1. Find shopkeeper by their unique shopkeeperCode. The code is always stored in uppercase.
    const shopkeepersRef = collection(firestore, 'shopkeepers');
    const qShopkeeperByCode = query(shopkeepersRef, where('shopkeeperCode', '==', shopkeeperIdentifier.toUpperCase()));
    
    const shopkeeperSnapshot = await getDocs(qShopkeeperByCode);

    if (shopkeeperSnapshot.empty) {
        throw new Error('No shopkeeper found with this code. Please check the code and try again.');
    }
    
    const shopkeeperDoc = shopkeeperSnapshot.docs[0];
    const actualShopkeeperId = shopkeeperDoc.id;
    const shopkeeperData = shopkeeperDoc.data();

    // 2. Check if already connected using the definitive UID
    const customerDoc = await getDoc(doc(firestore, 'customers', customerId));
    const customerConnections = customerDoc.data()?.connections || [];
    if (customerConnections.includes(actualShopkeeperId)) {
        return {
            status: 'already_connected',
            shopkeeper: { id: actualShopkeeperId, name: shopkeeperData.displayName }
        };
    }

    // 3. Check if a pending request already exists to prevent duplicates
    const requestsRef = collection(firestore, 'connectionRequests');
    const qExisting = query(requestsRef, 
        where('customerId', '==', customerId), 
        where('shopkeeperId', '==', actualShopkeeperId),
        where('status', '==', 'pending')
    );
    const existingRequestSnapshot = await getDocs(qExisting);
    
    if (!existingRequestSnapshot.empty) {
        throw new Error("A connection request has already been sent and is pending approval.");
    }
    
    // 4. Create the new connection request
    await addDoc(requestsRef, {
      customerId,
      shopkeeperId: actualShopkeeperId,
      customerName: customerName || 'A new customer',
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return { status: 'request_sent' };
};


export const acceptConnectionRequest = async (firestore: Firestore, payload: ConnectionRequestPayload) => {
  const { requestId, customerId, shopkeeperId } = payload;
  
  const batch = writeBatch(firestore);

  // Update request status to approved
  const requestRef = doc(firestore, 'connectionRequests', requestId);
  batch.update(requestRef, { status: 'approved' });

  // Add customerId to shopkeeper's connections array
  const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
  batch.update(shopkeeperRef, {
      connections: arrayUnion(customerId)
  });

  // Add shopkeeperId to customer's connections array
  const customerRef = doc(firestore, 'customers', customerId);
  batch.update(customerRef, {
      connections: arrayUnion(shopkeeperId)
  });

  await batch.commit();
};

export const rejectConnectionRequest = async (firestore: Firestore, requestId: string) => {
  const requestRef = doc(firestore, 'connectionRequests', requestId);
  await updateDoc(requestRef, { status: 'rejected' });
};
