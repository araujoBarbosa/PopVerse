import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    // Substitua pelos valores do app Web configurado no Firebase Console.
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
export const storage = getStorage(app);

// Login anônimo disparado sem usar top-level await (evita travar browsers que não suportam)
export async function ensureAnonymousAuth() {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
        return auth.currentUser;
    } catch (err) {
        console.error(
            "Falha no login anônimo. Verifique se Authentication está habilitado e se as chaves do app Web estão corretas.",
            err
        );
        return null;
    }
}

// Dispara imediatamente; a página continua carregando enquanto o login ocorre
ensureAnonymousAuth();
