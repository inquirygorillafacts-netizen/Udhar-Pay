import { doc, writeBatch, type Firestore } from 'firebase/firestore';

interface ConnectionRequestPayload {
  requestId: string;
  customerId: string;
  shopkeeperId: string;
}

export const acceptConnectionRequest = async (firestore: Firestore, payload: ConnectionRequestPayload) => {
  const { requestId, customerId, shopkeeperId } = payload;
  
  const batch = writeBatch(firestore);

  // Update request status
  const requestRef = doc(firestore, 'connectionRequests', requestId);
  batch.update(requestRef, { status: 'approved' });

  // Add connection to shopkeeper
  const shopkeeperRef = doc(firestore, 'shopkeepers', shopkeeperId);
  batch.update(shopkeeperRef, {
    connections: [...((await getDoc(shopkeeperRef)).data()?.connections || []), customerId]
  });

  // Add connection to customer
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
