
// Use standard Firebase v9+ modular imports for all modules
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// En Vite/Vercel, usamos import.meta.env
// Añadimos fallbacks vacíos para evitar que initializeApp falle si no están definidas
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Log de advertencia si faltan llaves (solo en consola)
if (!firebaseConfig.apiKey) {
  console.warn("Firebase: Las variables de entorno no están configuradas.");
}

// Inicialización de Firebase Modular v9
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics con verificación de soporte para navegadores
if (typeof window !== "undefined") {
  isSupported().then(yes => yes && getAnalytics(app));
}

export default app;
