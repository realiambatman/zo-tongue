import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "REDACTED",
  authDomain: "zotongue.firebaseapp.com",
  projectId: "zotongue",
  storageBucket: "zotongue.firebasestorage.app",
  messagingSenderId: "161232113236",
  appId: "1:161232113236:web:c3cad03064f681c55be7c1",
  measurementId: "G-7WELJT3RZW",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
