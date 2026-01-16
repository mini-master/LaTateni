import { auth, ADMIN_EMAILS } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Import config values properly by extracting them from the file manually 
// (or we can just copy-paste the config object since we can't import `firebaseConfig` if it's not exported. 
//  Easier trick: Import the module, but we need the raw config object to init a SECOND app.)

// HACK: Re-defining config here to avoid export issues or file complexity. 
// In a larger app, we would export the raw config object from firebase-config.js.
const firebaseConfig = {
    apiKey: "AIzaSyA3jEiCIbFdgpTIJMi_N-NTLn0n0ZHi9UQ",
    authDomain: "latateni-4c164.firebaseapp.com",
    projectId: "latateni-4c164",
    storageBucket: "latateni-4c164.firebasestorage.app",
    messagingSenderId: "879791169490",
    appId: "1:879791169490:web:6d92b492cf6d41b6e5f20b",
    measurementId: "G-JNN85TD5M8"
};

// Guard: Only allow logged in users (and ideally specific admins)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        // Strict Admin Check
        if (!ADMIN_EMAILS.includes(user.email)) {
            alert("Ingen adgang. Kun for administratorer.");
            window.location.href = 'home.html';
        }
    }
});

window.createCoach = async function () {
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const statusMsg = document.getElementById('status-msg');

    if (!email || !password) {
        showStatus("Udfyld både email og kode.", "error");
        return;
    }
    if (password.length < 6) {
        showStatus("Koden skal være mindst 6 tegn.", "error");
        return;
    }

    try {
        // TRICK: Initialize a SECOND app instance named 'Secondary'.
        // This allows us to create a user on THAT instance without changing the 'currentUser' of the main app.
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        await createUserWithEmailAndPassword(secondaryAuth, email, password);

        // Cleanup: Sign out the secondary auth immediately so it doesn't linger
        await signOut(secondaryAuth);

        // (Optional: We could delete the secondary app, but JS SDK doesn't always need that for simple pages)

        showStatus(`Succes! Træner oprettet: ${email}`, "success");
        document.getElementById('new-email').value = '';
        document.getElementById('new-password').value = '';

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            showStatus("Denne email er allerede i brug.", "error");
        } else {
            showStatus("Fejl: " + error.message, "error");
        }
    }
}

function showStatus(msg, type) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = type; // 'success' or 'error'
    el.style.display = 'block';
}
