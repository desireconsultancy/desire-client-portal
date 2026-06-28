import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDIwFyN8ojOBYqm2xSAZEL1V7Kh2eio9X8",
  authDomain: "desire-consultancy-s-app.firebaseapp.com",
  projectId: "desire-consultancy-s-app",
  storageBucket: "desire-consultancy-s-app.firebasestorage.app",
  messagingSenderId: "706247267233",
  appId: "1:706247267233:web:a457191bd028b3117971e0",
  measurementId: "G-SZHHQZLE6W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
