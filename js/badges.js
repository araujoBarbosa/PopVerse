import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function avaliarBadges(salaId) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    const data = snap.exists() ? snap.data() : {};
    const badges = new Set(data.badges || []);

    if ((data.mensagens || 0) >= 1) badges.add("primeira_mensagem");
    if ((data.mensagens || 0) >= 50) badges.add("tagarela");
    if ((data.xpTotal || 0) >= 300) badges.add("veterano");

    await setDoc(ref, { badges: Array.from(badges) }, { merge: true });
}
