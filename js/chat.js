import { db, auth } from "./firebase.js";
import { getSalaId } from "./utils.js";
import { addXP } from "./xp.js";
import { checarModeracao } from "./moderacao.js";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const salaId = getSalaId();
const mensagensRef = collection(db, "salas", salaId, "mensagens");

export async function enviarMensagem(texto, nome) {
    if (!texto || !texto.trim()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const status = await checarModeracao(salaId, uid);
    if (status.ban || status.mute) return;

    await addDoc(mensagensRef, {
        tipo: "texto",
        texto: texto.trim(),
        nome: nome || null,
        uid,
        criadoEm: serverTimestamp()
    });

    await addXP(salaId, 5);
}

export async function enviarMensagemVoz(audioUrl, duracaoMs, nome) {
    if (!audioUrl) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const status = await checarModeracao(salaId, uid);
    if (status.ban || status.mute) return;

    await addDoc(mensagensRef, {
        tipo: "voz",
        audioUrl,
        duracaoMs: typeof duracaoMs === "number" ? duracaoMs : null,
        nome: nome || null,
        uid,
        criadoEm: serverTimestamp()
    });

    await addXP(salaId, 5);
}

export function escutarMensagens(render) {
    const myUid = auth.currentUser?.uid || "";
    const q = query(mensagensRef, orderBy("criadoEm"));
    onSnapshot(q, snapshot => {
        const msgs = [];
        snapshot.forEach(docSnap => msgs.push(docSnap.data()));
        render(msgs, myUid);
    });
}
