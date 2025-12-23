// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // <--- 1. IMPORTAR ESTO
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

if (!firebaseConfig.apiKey) {
  console.warn("Firebase: Las variables de entorno no están configuradas.");
}

const app = initializeApp(firebaseConfig);

// Exportamos los servicios
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- 2. EXPORTAR ESTO

if (typeof window !== "undefined") {
  isSupported().then(yes => yes && getAnalytics(app));
}

export default app;
