import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

// This file is currently not in use but is kept for potential future notification features.
// The credit limit notification logic has been integrated directly into the transaction flow
// for a more immediate and robust user experience.

/**
 * @deprecated This function is no longer used. The logic is now handled client-side before a transaction is attempted.
 */
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
