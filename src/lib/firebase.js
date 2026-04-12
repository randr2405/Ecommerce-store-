import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA7m8B6viZif6UIB-MtocxpbpYwDgKYzdU",
  authDomain: "rr-pos-system.firebaseapp.com",
  projectId: "rr-pos-system",
  storageBucket: "rr-pos-system.firebasestorage.app",
  messagingSenderId: "252327523307",
  appId: "1:252327523307:web:f2a52f195de36b3f4ddfae",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;