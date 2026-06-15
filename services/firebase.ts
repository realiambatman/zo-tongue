import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase config must come from environment variables (see .env.example).
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!firebaseApiKey) {
  throw new Error(
    "Missing VITE_FIREBASE_API_KEY. Copy .env.example to .env and set your Firebase config."
  );
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "zotongue.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zotongue",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "zotongue.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "161232113236",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:161232113236:web:c3cad03064f681c55be7c1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7WELJT3RZW",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
