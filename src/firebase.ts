import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgzLcQFl1jmLvQm8bNdKT7_atc3ftba5U",
  authDomain: "medtrack-lst.firebaseapp.com",
  projectId: "medtrack-lst",
  storageBucket: "medtrack-lst.firebasestorage.app",
  messagingSenderId: "504825825884",
  appId: "1:504825825884:web:d109ee9381d90b543cb499",
  measurementId: "G-FZCRT55B0C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;