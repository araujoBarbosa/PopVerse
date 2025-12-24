import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function salvarAvatar(avatar) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "users", uid);
    await setDoc(ref, {
        avatar,
        atualizadoEm: serverTimestamp()
    }, { merge: true });
}

export async function carregarAvatar(uidParam) {
    const uid = uidParam || auth.currentUser?.uid;
    if (!uid) return null;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().avatar : null;
}
