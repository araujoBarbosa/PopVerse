import { db } from "./firebase.js";
import { getSalaId } from "./utils.js";
import {
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function escutarRanking(render) {
    const salaId = getSalaId();
    const ref = collection(db, "salas", salaId, "ranking");
    const q = query(ref, orderBy("xp", "desc"));

    onSnapshot(q, snap => {
        const ranking = [];
        snap.forEach(d => ranking.push(d.data()));
        render(ranking);
    });
}
