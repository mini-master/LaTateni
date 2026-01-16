import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA3jEiCIbFdgpTIJMi_N-NTLn0n0ZHi9UQ",
    authDomain: "latateni-4c164.firebaseapp.com",
    projectId: "latateni-4c164",
    storageBucket: "latateni-4c164.firebasestorage.app",
    messagingSenderId: "879791169490",
    appId: "1:879791169490:web:6d92b492cf6d41b6e5f20b",
    measurementId: "G-JNN85TD5M8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const ADMIN_EMAILS = ["linusradk@gmail.com"];

export { db, auth, googleProvider, ADMIN_EMAILS };
