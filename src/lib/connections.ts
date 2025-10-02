import { doc, writeBatch, type Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';

interface ConnectionRequestPayload {
  requestId: string;
  customerId: string;
  shopkeeperId: string;
}

export const sendConnectionRequest = async (firestore: Firestore, customerId: string, shopkeeperId: string, customerName: string) => {
    // Check if a pending or approved request already exists
    const requestsRef = collection(firestore, 'connectionRequests');
    const q = query(requestsRef, 
        where('customerId', '==', customerId), 
        where('shopkeeperId', '==', shopkeeperId),
    );
    const existingRequestSnapshot = await getDocs(q);
    
    if (!existingRequestSnapshot.empty) {
        const existingRequest = existingRequestSnapshot.docs[0].data();
        if(existingRequest.status === 'pending') {
            throw new Error("A connection request has already been sent and is pending approval.");
        } else if (existingRequest.status === 'approved') {
            throw new Error("You are already connected to this shopkeeper.");
        }
    }
    
    await addDoc(requestsRef, {
      customerId,
      shopkeeperId,
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
  const shopkeeperDoc = await getDoc(shopkeeperRef);
  const shopkeeperConnections = shopkeeperDoc.data()?.connections || [];
  if (!shopkeeperConnections.includes(customerId)) {
    batch.update(shopkeeperRef, {
        connections: [...shopkeeperConnections, customerId]
    });
  }

  // Add shopkeeperId to customer's connections array
  const customerRef = doc(firestore, 'customers', customerId);
  const customerDoc = await getDoc(customerRef);
  const customerConnections = customerDoc.data()?.connections || [];
   if (!customerConnections.includes(shopkeeperId)) {
      batch.update(customerRef, {
        connections: [...customerConnections, shopkeeperId]
      });
   }

  await batch.commit();
};

export const rejectConnectionRequest = async (firestore: Firestore, requestId: string) => {
  const requestRef = doc(firestore, 'connectionRequests', requestId);
  await updateDoc(requestRef, { status: 'rejected' });
};
