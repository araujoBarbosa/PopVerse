import { db } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function checarModeracao(salaId, uid) {
    const ref = doc(db, "salas", salaId, "moderacao", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { mute: false, ban: false };
}

export async function aplicarMute(salaId, uid) {
    await setDoc(doc(db, "salas", salaId, "moderacao", uid), { mute: true }, { merge: true });
}

export async function aplicarBan(salaId, uid) {
    await setDoc(doc(db, "salas", salaId, "moderacao", uid), { ban: true }, { merge: true });
}
