import { auth, googleProvider } from './firebase-config.js';
import { signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// -- Logic --
const googleBtn = document.getElementById('google-login');
const emailForm = document.getElementById('email-form');
const errorBox = document.getElementById('error-box');

// Check if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'home.html';
    }
});

// Google Login
googleBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged will redirect
    } catch (error) {
        showError(error.message);
    }
});

// Email Login
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will redirect
    } catch (error) {
        let msg = "Fejl ved login.";
        if (error.code === 'auth/invalid-credential') msg = "Forkert email eller adgangskode.";
        showError(msg);
    }
});

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
}
