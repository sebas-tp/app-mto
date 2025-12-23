
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Acceso seguro a variables de entorno inyectadas
const getEnv = (key: string) => {
  return (typeof process !== 'undefined' && process.env && (process.env as any)[key]) || '';
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
};

// Inicialización de la App
// Fix: initializeApp is a named export in modern Firebase SDKs
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics con verificación de soporte
if (typeof window !== "undefined") {
  isSupported().then(yes => yes && getAnalytics(app));
}

export default app;
