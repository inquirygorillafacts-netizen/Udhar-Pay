'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore, initializeFirestore, memoryLocalCache, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf-JLtE26oGUKaNHo2QX3npzLt6reD-rw",
  authDomain: "udhar-pay-b3ff7.firebaseapp.com",
  projectId: "udhar-pay-b3ff7",
  storageBucket: "udhar-pay-b3ff7.appspot.com",
  messagingSenderId: "964637228383",
  appId: "1:964637228383:web:e1384647c578a464c40aea",
  measurementId: "G-M9F09KSFMW"
};

type FirebaseContextValue = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [contextValue, setContextValue] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    const getClientApp = (): FirebaseApp => {
      if (getApps().length) {
        return getApps()[0];
      }
      return initializeApp(firebaseConfig);
    };

    const app = getClientApp();
    const auth = getAuth(app);
    
    // Use the new recommended way to initialize Firestore with persistence
    const firestore = initializeFirestore(app, {
      // Using persistent cache for offline capabilities
      localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
    });
    
    setContextValue({ app, auth, firestore });

  }, []);

  if (!contextValue) {
      // You can return a loader here if you want
      return null;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === null) {
    throw new Error("useFirebase must be used within a FirebaseClientProvider");
  }
  return context;
};
