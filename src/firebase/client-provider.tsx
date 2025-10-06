"use client";

import React, { createContext, useContext } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2ZmDXC6s9FBfCgaV-8WSqLkag4sJwad4",
  authDomain: "gen-lang-client-0964053944.firebaseapp.com",
  projectId: "gen-lang-client-0964053944",
  storageBucket: "gen-lang-client-0964053944.appspot.com",
  messagingSenderId: "73460410734",
  appId: "1:73460410734:web:8381b2d6200bb4a4a6b97f",
  measurementId: "G-SBVQGY01MT"
};

type FirebaseContextValue = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const getClientApp = (): FirebaseApp => {
    if (getApps().length) {
      return getApps()[0];
    }
    return initializeApp(firebaseConfig);
  };

  const app = getClientApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  // If you want to use the local emulators, uncomment the lines below
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    if (!(firestore as any)._settings.host) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
  }

  return (
    <FirebaseContext.Provider value={{ app, auth, firestore }}>
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
