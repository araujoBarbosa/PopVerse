import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLjyTVXTZA5bdgANSWOI7sMNATutnuQGc",
    authDomain: "popverse-9cffa.firebaseapp.com",
    projectId: "popverse-9cffa",
    storageBucket: "popverse-9cffa.firebasestorage.app",
    messagingSenderId: "310324226036",
    appId: "1:310324226036:web:a079455b8404591eccfba1"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// login anônimo
await signInAnonymously(auth);
