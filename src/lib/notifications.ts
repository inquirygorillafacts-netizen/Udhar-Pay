import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

export const sendCreditLimitNotification = async (
    firestore: Firestore, 
    shopkeeperId: string, 
    customerId: string, 
    limit: number,
    attemptedAmount: number
) => {
    try {
        await addDoc(collection(firestore, 'notifications'), {
            type: 'CREDIT_LIMIT_REACHED',
            shopkeeperId,
            customerId,
            message: `Shopkeeper tried to give ₹${attemptedAmount} credit, but your limit of ₹${limit} is reached.`,
            isRead: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending credit limit notification:", error);
    }
};
