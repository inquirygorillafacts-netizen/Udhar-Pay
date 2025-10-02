import { doc, writeBatch, type Firestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

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
        where('status', 'in', ['pending', 'approved'])
    );
    const existingRequest = await getDocs(q);

    if (!existingRequest.empty) {
        throw new Error("A connection request already exists or is already approved.");
    }
    
    await addDoc(requestsRef, {
      customerId,
      shopkeeperId,
      customerName,
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
    connections: [...((await getDoc(shopkeeperRef)).data()?.connections || []), customerId]
  });

  // Add shopkeeperId to customer's connections array
  const customerRef = doc(firestore, 'customers', customerId);
  batch.update(customerRef, {
    connections: [...((await getDoc(customerRef)).data()?.connections || []), shopkeeperId]
  });

  await batch.commit();
};

export const rejectConnectionRequest = async (firestore: Firestore, requestId: string) => {
  const requestRef = doc(firestore, 'connectionRequests', requestId);
  await updateDoc(requestRef, { status: 'rejected' });
};
