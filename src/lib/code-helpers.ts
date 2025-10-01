'use client';

import { collection, query, where, getDocs, type Firestore } from 'firebase/firestore';

// --- Customer Code Generation ---

/**
 * Generates a random 1-digit number as a string for testing.
 */
function generateCustomerCode(): string {
  // This will generate a number between 0 and 9.
  return Math.floor(Math.random() * 10).toString();
}

/**
 * Checks if a customer code already exists in the 'customers' collection.
 * @param firestore - The Firestore instance.
 * @param code - The code to check.
 * @returns {Promise<boolean>} - True if the code exists, false otherwise.
 */
async function customerCodeExists(firestore: Firestore, code: string): Promise<boolean> {
  const customersRef = collection(firestore, 'customers');
  const q = query(customersRef, where('customerCode', '==', code));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

/**
 * Generates a unique 1-digit code for a customer.
 * It keeps generating a new code until a unique one is found.
 * @param firestore - The Firestore instance.
 * @returns {Promise<string>} - A unique 1-digit customer code.
 */
export async function generateUniqueCustomerCode(firestore: Firestore): Promise<string> {
  let uniqueCode: string;
  let isUnique = false;

  // Keep looping until a unique code is found
  while (!isUnique) {
    uniqueCode = generateCustomerCode();
    const exists = await customerCodeExists(firestore, uniqueCode);
    if (!exists) {
      isUnique = true;
      return uniqueCode;
    }
  }
  // This part should theoretically never be reached.
  throw new Error("Failed to generate a unique customer code after multiple attempts.");
}


// --- Shopkeeper Code Generation ---

const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a random 7-character alphanumeric string.
 */
function generateShopkeeperCode(): string {
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += ALPHANUMERIC_CHARS.charAt(Math.floor(Math.random() * ALPHANUMERIC_CHARS.length));
  }
  return result;
}

/**
 * Checks if a shopkeeper code already exists in the 'shopkeepers' collection.
 * @param firestore - The Firestore instance.
 * @param code - The code to check.
 * @returns {Promise<boolean>} - True if the code exists, false otherwise.
 */
async function shopkeeperCodeExists(firestore: Firestore, code: string): Promise<boolean> {
  const shopkeepersRef = collection(firestore, 'shopkeepers');
  const q = query(shopkeepersRef, where('shopkeeperCode', '==', code));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

/**
 * Generates a unique 7-character alphanumeric code for a shopkeeper.
 * It keeps generating a new code until a unique one is found.
 * @param firestore - The Firestore instance.
 * @returns {Promise<string>} - A unique 7-character shopkeeper code.
 */
export async function generateUniqueShopkeeperCode(firestore: Firestore): Promise<string> {
  let uniqueCode: string;
  let isUnique = false;

  // Keep looping until a unique code is found
  while (!isUnique) {
    uniqueCode = generateShopkeeperCode();
    const exists = await shopkeeperCodeExists(firestore, uniqueCode);
    if (!exists) {
      isUnique = true;
      return uniqueCode;
    }
  }
  // This part should theoretically never be reached.
  throw new Error("Failed to generate a unique shopkeeper code after multiple attempts.");
}
