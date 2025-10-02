import { doc, writeBatch, type Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';

interface ConnectionRequestPayload {
  requestId: string;
  customerId: string;
  shopkeeperId: string;
}

export const sendConnectionRequest = async (firestore: Firestore, customerId: string, shopkeeperId: string, customerName: string) => {
    // 1. Find shopkeeper by their unique code
    const shopkeepersRef = collection(firestore, 'shopkeepers');
    const qShopkeeper = query(shopkeepersRef, where('shopkeeperCode', '==', shopkeeperId.toUpperCase()));
    const shopkeeperSnapshot = await getDocs(qShopkeeper);

    if (shopkeeperSnapshot.empty) {
        throw new Error('No shopkeeper found with this code. Please check the code and try again.');
    }
    const shopkeeperDoc = shopkeeperSnapshot.docs[0];
    const actualShopkeeperId = shopkeeperDoc.id;

    // 2. Check if a connection or pending request already exists
    const requestsRef = collection(firestore, 'connectionRequests');
    const qExisting = query(requestsRef, 
        where('customerId', '==', customerId), 
        where('shopkeeperId', '==', actualShopkeeperId),
    );
    const existingRequestSnapshot = await getDocs(qExisting);
    
    if (!existingRequestSnapshot.empty) {
        const existingRequest = existingRequestSnapshot.docs[0].data();
        if(existingRequest.status === 'pending') {
            throw new Error("A connection request has already been sent and is pending approval.");
        } else if (existingRequest.status === 'approved') {
            throw new Error("You are already connected to this shopkeeper.");
        }
    }
    
    // 3. Create the new connection request
    await addDoc(requestsRef, {
      customerId,
      shopkeeperId: actualShopkeeperId,
      customerName: customerName || 'A new customer',
      status: 'pending',
      createdAt: serverTimestamp()
    });
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
