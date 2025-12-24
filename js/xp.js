import { db, auth } from "./firebase.js";
import { calcularNivel } from "./levels.js";
import { mostrarLevelUp } from "./levelup.js";
import { carregarAvatar } from "./avatar-store.js";
import { avaliarBadges } from "./badges.js";
import {
    doc,
    setDoc,
    getDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function addXP(salaId, valor = 5) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "salas", salaId, "ranking", uid);
    const userRef = doc(db, "users", uid);

    const snap = await getDoc(ref);
    const xpAtual = snap.exists() ? snap.data().xp || 0 : 0;
    const antes = calcularNivel(xpAtual);
    const depois = calcularNivel(xpAtual + valor);

    const avatar = await carregarAvatar(uid);

    await setDoc(ref, {
        xp: increment(valor),
        mensagens: increment(1),
        atualizadoEm: serverTimestamp(),
        avatar: avatar || null,
        nivel: depois.nivel,
        titulo: depois.titulo
    }, { merge: true });

    await setDoc(userRef, {
        xpTotal: increment(valor),
        mensagens: increment(1),
        nivel: depois.nivel,
        titulo: depois.titulo,
        avatar: avatar || null,
        atualizadoEm: serverTimestamp()
    }, { merge: true });

    await avaliarBadges(salaId);

    if (depois.nivel > antes.nivel) {
        mostrarLevelUp(depois.nivel, depois.titulo);
    }
}
