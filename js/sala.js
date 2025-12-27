import { db, auth, ensureAnonymousAuth, storage } from "./firebase.js";
import { getSalaId } from "./utils.js";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { enviarMensagem, enviarMensagemVoz, escutarMensagens } from "./chat.js";
import { escutarRanking } from "./ranking.js";
import { calcularNivel } from "./levels.js";
import { carregarAvatar, salvarAvatar } from "./avatar-store.js";
import { converterParaGoogle } from "./converterConta.js";

document.addEventListener("DOMContentLoaded", async () => {
    await ensureAnonymousAuth();

    function tryParseAvatar(raw) {
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (err) {
            console.warn("Avatar local inválido, limpando cache", err);
            localStorage.removeItem("popverseAvatar");
            return null;
        }
    }

    async function carregarAvatarSincronizado() {
        const avatarLocal = tryParseAvatar(localStorage.getItem("popverseAvatar"));

        // Se já tem local, prioriza ele e apenas tenta replicar para a nuvem em background
        if (avatarLocal) {
            salvarAvatar(avatarLocal).catch(err => console.warn("Não foi possível salvar avatar local na nuvem", err));
            return avatarLocal;
        }

        // Caso não tenha local, tenta buscar da nuvem
        try {
            const uid = auth.currentUser?.uid;
            const cloudAvatar = await carregarAvatar(uid);
            if (cloudAvatar) {
                localStorage.setItem("popverseAvatar", JSON.stringify(cloudAvatar));
                return cloudAvatar;
            }
        } catch (err) {
            console.warn("Falha ao carregar avatar da nuvem", err);
        }

        return null;
    }

    const avatar = await carregarAvatarSincronizado();

    if (!avatar) {
        window.location.href = "./avatar.html";
        return;
    }

    // Garante que o cache local fica consistente mesmo após recuperar da nuvem
    try {
        localStorage.setItem("popverseAvatar", JSON.stringify(avatar));
    } catch (err) {
        console.warn("Não foi possível reafirmar o avatar no cache local", err);
    }

    const salaId = getSalaId();

    // Sala Geral reidrata do localStorage; demais salas usam o avatar carregado
    function getCurrentAvatar() {
        if (salaId === "geral") {
            return tryParseAvatar(localStorage.getItem("popverseAvatar")) || avatar;
        }
        return avatar;
    }
    const chatUser = document.getElementById("chatUser");
    const chatAvatar = document.getElementById("chatAvatar");
    const chatHair = document.getElementById("chatHair");
    const chatEyes = document.getElementById("chatEyes");
    const chatMouth = document.getElementById("chatMouth");
    const chatClothes = document.getElementById("chatClothes");
    const chatAccessory = document.getElementById("chatAccessory");
    const musicInput = document.getElementById("musicInput");
    const musicSend = document.getElementById("musicSend");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const btnGoogle = document.getElementById("btnGoogle");
    const participantsEl = document.getElementById("roomParticipants");
    const occupancyEl = document.getElementById("roomOccupancy");
    const voiceRecord = document.getElementById("voiceRecord");
    const voiceSend = document.getElementById("voiceSend");
    const voiceCancel = document.getElementById("voiceCancel");
    const voiceStatus = document.getElementById("voiceStatus");
    const voiceTimer = document.getElementById("voiceTimer");
    const voicePreview = document.getElementById("voicePreview");

    let mediaRecorder;
    let voiceChunks = [];
    let voiceTimerInterval;
    let voiceLimitTimeout;
    let recordStart = 0;
    let lastVoiceBlob;
    let lastVoiceBlobUrl = "";
    let lastVoiceDuration = 0;

    function applyClass(el, base, extra) {
        if (!el) return;
        el.className = base + (extra ? " " + extra : "");
    }

    function pickVariant(value, base) {
        if (!value) return "";
        const parts = value.split(" ");
        const found = parts.find(c => c.startsWith(base + "-"));
        return found || value;
    }

    function cloneAvatarData(base, overrides = {}) {
        return {
            id: overrides.id || base.id || base.userId || "",
            name: overrides.name || base.name || "Amigo",
            skinColor: overrides.skinColor || base.skinColor || "#F7A8C8",
            hairVariant: overrides.hairVariant
                || base.hairVariant
                || base.hairStyleVariant
                || pickVariant(base.hairStyle || "", "hair"),
            eyesVariant: overrides.eyesVariant
                || base.eyesVariant
                || base.eyesStyleVariant
                || pickVariant(base.eyesStyle || "", "eyes"),
            mouthVariant: overrides.mouthVariant
                || base.mouthVariant
                || base.mouthStyleVariant
                || pickVariant(base.mouthStyle || "", "mouth"),
            clothesVariant: overrides.clothesVariant
                || base.clothesVariant
                || base.clothesStyleVariant
                || pickVariant(base.clothesStyle || "", "clothes"),
            accessoryVariant: overrides.accessoryVariant
                || base.accessoryVariant
                || base.accessoryStyleVariant
                || pickVariant(base.accessoryStyle || "", "acc"),
            hairColor: overrides.hairColor || base.hairColor || "#1F1F1F"
        };
    }

    function createSeat(position, avatarData) {
        const seat = document.createElement("div");
        seat.className = `participant-seat ${position}`;

        const circle = document.createElement("div");
        circle.className = "avatar-circle small";
        circle.style.backgroundColor = avatarData.skinColor;

        const hair = document.createElement("div");
        hair.className = "hair" + (avatarData.hairVariant ? ` ${avatarData.hairVariant}` : "");
        hair.style.backgroundColor = avatarData.hairColor;

        const acc = document.createElement("div");
        acc.className = "accessory" + (avatarData.accessoryVariant ? ` ${avatarData.accessoryVariant}` : "");

        const eyes = document.createElement("div");
        eyes.className = "eyes" + (avatarData.eyesVariant ? ` ${avatarData.eyesVariant}` : "");

        const mouth = document.createElement("div");
        mouth.className = "mouth" + (avatarData.mouthVariant ? ` ${avatarData.mouthVariant}` : "");

        const clothes = document.createElement("div");
        clothes.className = "clothes" + (avatarData.clothesVariant ? ` ${avatarData.clothesVariant}` : "");

        circle.appendChild(hair);
        circle.appendChild(acc);
        circle.appendChild(eyes);
        circle.appendChild(mouth);
        circle.appendChild(clothes);

        const name = document.createElement("span");
        name.className = "participant-name";
        name.textContent = avatarData.name;

        seat.appendChild(circle);
        seat.appendChild(name);
        return seat;
    }

    function renderParticipants(list) {
        if (!participantsEl) return;
        participantsEl.innerHTML = "";
        const seats = ["seat-top-left", "seat-top-right", "seat-bottom-left", "seat-bottom-right"];
        list.slice(0, 4).forEach((p, idx) => {
            const seat = createSeat(seats[idx], p);
            participantsEl.appendChild(seat);
        });
    }

    function sanitizeText(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function appendMessage(innerHtml) {
        const messages = document.getElementById("messages");
        if (!messages) return;
        const msg = document.createElement("div");
        msg.className = "message";
        msg.innerHTML = innerHtml;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }

    function formatDuration(ms) {
        const totalSeconds = Math.max(0, Math.round(ms / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${minutes}:${seconds}`;
    }

    function clearVoicePreview() {
        if (lastVoiceBlobUrl) {
            URL.revokeObjectURL(lastVoiceBlobUrl);
            lastVoiceBlobUrl = "";
        }
        if (voicePreview) {
            voicePreview.src = "";
            voicePreview.style.display = "none";
        }
    }

    function resetVoiceUI() {
        clearInterval(voiceTimerInterval);
        clearTimeout(voiceLimitTimeout);
        voiceTimerInterval = undefined;
        voiceLimitTimeout = undefined;
        recordStart = 0;
        lastVoiceDuration = 0;
        voiceChunks = [];
        lastVoiceBlob = undefined;
        if (voiceStatus) voiceStatus.textContent = "Grave uma mensagem de voz";
        if (voiceTimer) voiceTimer.textContent = "00:00";
        if (voiceRecord) {
            voiceRecord.disabled = false;
            voiceRecord.textContent = "🎙️ Gravar voz";
        }
        if (voiceSend) voiceSend.disabled = true;
        if (voiceCancel) voiceCancel.disabled = true;
        if (mediaRecorder && mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        mediaRecorder = undefined;
        clearVoicePreview();
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        clearTimeout(voiceLimitTimeout);
    }

    function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (voiceStatus) voiceStatus.textContent = "Microfone não suportado neste dispositivo.";
            return;
        }

        clearVoicePreview();
        lastVoiceBlob = undefined;
        lastVoiceBlobUrl = "";
        voiceChunks = [];

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = evt => {
                if (evt.data && evt.data.size > 0) voiceChunks.push(evt.data);
            };

            mediaRecorder.onstop = () => {
                clearInterval(voiceTimerInterval);
                clearTimeout(voiceLimitTimeout);
                const duration = recordStart ? Date.now() - recordStart : lastVoiceDuration;
                lastVoiceDuration = duration;
                recordStart = 0;

                if (!voiceChunks.length) {
                    resetVoiceUI();
                    return;
                }

                const blob = new Blob(voiceChunks, { type: "audio/webm" });
                lastVoiceBlob = blob;
                lastVoiceBlobUrl = URL.createObjectURL(blob);

                if (voicePreview) {
                    voicePreview.src = lastVoiceBlobUrl;
                    voicePreview.style.display = "block";
                }

                if (voiceStatus) voiceStatus.textContent = "Pronto para enviar";
                if (voiceRecord) {
                    voiceRecord.textContent = "Gravar novamente";
                    voiceRecord.disabled = false;
                }
                if (voiceSend) voiceSend.disabled = false;
                if (voiceCancel) voiceCancel.disabled = false;

                stream.getTracks().forEach(track => track.stop());
            };

            recordStart = Date.now();
            if (voiceTimer) voiceTimer.textContent = "00:00";
            if (voiceStatus) voiceStatus.textContent = "Gravando... toque para parar";
            if (voiceRecord) voiceRecord.textContent = "Parar gravação";
            if (voiceSend) voiceSend.disabled = true;
            if (voiceCancel) voiceCancel.disabled = false;

            voiceTimerInterval = setInterval(() => {
                lastVoiceDuration = Date.now() - recordStart;
                if (voiceTimer) voiceTimer.textContent = formatDuration(lastVoiceDuration);
            }, 250);

            voiceLimitTimeout = setTimeout(() => stopRecording(), 60000);

            mediaRecorder.start();
        }).catch(() => {
            if (voiceStatus) voiceStatus.textContent = "Permissão de microfone negada.";
            resetVoiceUI();
        });
    }

    function appendVoiceMessage(name, audioUrl, durationMs) {
        if (!audioUrl) return;
        const durationLabel = formatDuration(durationMs || 0);
        const safeName = sanitizeText(name || "Você");
        appendMessage(`<strong>${safeName}:</strong> 🎤 Mensagem de voz (${durationLabel})<br><audio controls src="${audioUrl}" preload="metadata"></audio>`);
    }

    function applyChatAvatar(av) {
        if (!av) return;
        if (chatUser) chatUser.textContent = av.name || "Avatar";
        if (chatAvatar) chatAvatar.style.backgroundColor = av.skinColor || "#F7A8C8";

        const hairVariant = av.hairVariant || av.hairStyleVariant || pickVariant(av.hairStyle || "", "hair");
        const eyesVariant = av.eyesVariant || av.eyesStyleVariant || pickVariant(av.eyesStyle || "", "eyes");
        const mouthVariant = av.mouthVariant || av.mouthStyleVariant || pickVariant(av.mouthStyle || "", "mouth");
        const clothesVariant = av.clothesVariant || av.clothesStyleVariant || pickVariant(av.clothesStyle || "", "clothes");
        const accessoryVariant = av.accessoryVariant || av.accessoryStyleVariant || pickVariant(av.accessoryStyle || "", "acc");
        const hairColor = av.hairColor || "#1F1F1F";

        if (hairVariant) applyClass(chatHair, "hair", hairVariant);
        if (chatHair) chatHair.style.background = `radial-gradient(circle at 30% 20%, rgba(255,255,255,.18) 0%, ${hairColor} 55%, rgba(0,0,0,.55) 140%)`;
        if (eyesVariant) applyClass(chatEyes, "eyes", eyesVariant);
        if (mouthVariant) applyClass(chatMouth, "mouth", mouthVariant);
        if (clothesVariant) applyClass(chatClothes, "clothes", clothesVariant);
        applyClass(chatAccessory, "accessory", accessoryVariant || "");
    }

    applyChatAvatar(getCurrentAvatar());

    let salaIniciada = false;

    onAuthStateChanged(auth, user => {
        if (user && !salaIniciada) {
            salaIniciada = true;
            window.userId = user.uid; // 🔥 ID ÚNICO REAL
            iniciarSala(user.uid);
        }
    });

    // Garante que o login anônimo é iniciado mesmo se o import do firebase não fizer o await
    ensureAnonymousAuth();

    async function iniciarSala(userId) {
        const baseAv = getCurrentAvatar();
        const me = cloneAvatarData(baseAv, { name: baseAv.name || "Você", id: userId });

        const roomName = salaId;

        async function limparMensagensDaSala() {
            try {
                const mensagensRef = collection(db, "salas", salaId, "mensagens");
                const snap = await getDocs(mensagensRef);
                const removals = [];
                snap.forEach(docSnap => removals.push(deleteDoc(docSnap.ref)));
                await Promise.all(removals);
            } catch (err) {
                console.error("Falha ao limpar mensagens da sala", err);
            }
        }

        // Presença em tempo real (Firestore)
        const onlineCountEl = document.getElementById("onlineCount");
        const presencaRef = doc(db, "salas", salaId, "presencas", userId);
        const listaRef = collection(db, "salas", salaId, "presencas");
        const PRESENCE_STALE_MS = 45000;
        let keepAliveInterval;

        function timestampToMs(ts) {
            if (!ts) return 0;
            if (typeof ts === "number") return ts;
            if (typeof ts.toMillis === "function") {
                try {
                    return ts.toMillis();
                } catch (err) {
                    return 0;
                }
            }
            return 0;
        }

        async function cleanupStalePresences() {
            try {
                const snap = await getDocs(listaRef);
                const removals = [];
                snap.forEach(docSnap => {
                    const data = docSnap.data() || {};
                    const lastActiveMs = timestampToMs(data.lastActive) || timestampToMs(data.entrouEm);
                    const isStale = !lastActiveMs || Date.now() - lastActiveMs > PRESENCE_STALE_MS;
                    if (isStale) removals.push(deleteDoc(docSnap.ref));
                });
                if (removals.length) await Promise.allSettled(removals);
            } catch (err) {
                console.warn("Falha ao limpar presenças antigas", err);
            }
        }

        async function keepAlivePresence() {
            const av = getCurrentAvatar();
            const hairVariant = av.hairStyleVariant || pickVariant(av.hairStyle || "", "hair");
            const eyesVariant = av.eyesStyleVariant || pickVariant(av.eyesStyle || "", "eyes");
            const mouthVariant = av.mouthStyleVariant || pickVariant(av.mouthStyle || "", "mouth");
            const clothesVariant = av.clothesStyleVariant || pickVariant(av.clothesStyle || "", "clothes");
            const accessoryVariant = av.accessoryStyleVariant || pickVariant(av.accessoryStyle || "", "acc");

            try {
                await setDoc(
                    presencaRef,
                    {
                        id: userId,
                        online: true,
                        entrouEm: serverTimestamp(),
                        lastActive: serverTimestamp(),
                        nome: av.name || "Você",
                        skinColor: av.skinColor || "#F7A8C8",
                        hairVariant,
                        eyesVariant,
                        mouthVariant,
                        clothesVariant,
                        accessoryVariant,
                        hairColor: av.hairColor || "#1F1F1F"
                    },
                    { merge: true }
                );
            } catch (err) {
                console.error("Falha ao registrar presença", err);
            }
        }

        async function leavePresence() {
            clearInterval(keepAliveInterval);
            try {
                await deleteDoc(presencaRef);
            } catch (err) {
                // já removido ou offline; ignore
            }
        }

        function startKeepAlive() {
            clearInterval(keepAliveInterval);
            keepAlivePresence();
            keepAliveInterval = setInterval(keepAlivePresence, 15000);
        }

        await cleanupStalePresences();
        startKeepAlive();

        // Garante que o próprio usuário aparece mesmo antes do snapshot do Firestore
        renderParticipants([me]);
        if (onlineCountEl) onlineCountEl.textContent = "1";

        function presenceToParticipant(docSnap) {
            const data = docSnap.data() || {};
            return cloneAvatarData({
                id: data.id || docSnap.id,
                name: data.nome || data.name || "Amigo",
                skinColor: data.skinColor,
                hairVariant: data.hairVariant || data.hairStyleVariant,
                eyesVariant: data.eyesVariant || data.eyesStyleVariant,
                mouthVariant: data.mouthVariant || data.mouthStyleVariant,
                clothesVariant: data.clothesVariant || data.clothesStyleVariant,
                accessoryVariant: data.accessoryVariant || data.accessoryStyleVariant,
                hairColor: data.hairColor
            });
        }

        onSnapshot(listaRef, snapshot => {
            const participants = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data && data.online === false) return;

                const lastActiveMs = timestampToMs(data.lastActive) || timestampToMs(data.entrouEm);
                const isStale = !lastActiveMs || Date.now() - lastActiveMs > PRESENCE_STALE_MS;
                if (isStale) {
                    deleteDoc(docSnap.ref).catch(() => { });
                    return;
                }
                participants.push(presenceToParticipant(docSnap));
            });

            const ordered = participants
                .sort((a, b) => {
                    if (a.id === userId) return -1;
                    if (b.id === userId) return 1;
                    return (a.name || "").localeCompare(b.name || "");
                })
                .slice(0, 4);

            renderParticipants(ordered.length ? ordered : [me]);

            // Reafirma o avatar no topo com o valor mais recente (reidrata apenas na geral)
            applyChatAvatar(getCurrentAvatar());

            if (onlineCountEl) onlineCountEl.textContent = String(participants.length);
        }, err => {
            console.error("Erro ao escutar presença", err);
            renderParticipants([me]);
            if (onlineCountEl) onlineCountEl.textContent = "1";
        });

        window.addEventListener("beforeunload", () => {
            leavePresence();
        });

        window.addEventListener("pagehide", () => {
            leavePresence();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                leavePresence();
            } else {
                startKeepAlive();
            }
        });

        // Se o avatar foi salvo/alterado em outra aba, reidrata e reaplica imediatamente
        window.addEventListener("storage", evt => {
            if (evt.key !== "popverseAvatar") return;
            const updated = tryParseAvatar(evt.newValue);
            if (updated) {
                applyChatAvatar(updated);
                try {
                    localStorage.setItem("popverseAvatar", JSON.stringify(updated));
                } catch (err) {
                    console.warn("Não foi possível atualizar cache local do avatar", err);
                }
            }
        });

        // Limpa histórico ao entrar para que o chat comece vazio a cada sessão
        await limparMensagensDaSala();

        // Nome da sala pela URL
        const roomTitle = document.getElementById("roomTitle");
        if (roomTitle) roomTitle.textContent = roomName;

        const messages = document.getElementById("messages");
        const chatList = document.getElementById("chatMensagens");
        const rankingList = document.getElementById("rankingSala");
        if (btnGoogle) {
            btnGoogle.addEventListener("click", () => converterParaGoogle());
        }

        if (musicSend && musicInput && messages) {
            musicSend.addEventListener("click", () => {
                const link = musicInput.value.trim();
                if (!link) return;

                const safeText = link.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const anchor = link.startsWith("http://") || link.startsWith("https://")
                    ? `<a href="${safeText}" target="_blank" rel="noopener noreferrer">${safeText}</a>`
                    : safeText;

                appendMessage(`<strong>${sanitizeText(avatar.name || "Você")}:</strong> 🎵 ${anchor}`);
                musicInput.value = "";
            });
        }

        if (chatForm && chatInput && chatList) {
            chatForm.addEventListener("submit", async e => {
                e.preventDefault();
                const texto = chatInput.value || "";
                chatInput.value = "";
                chatInput.focus();

                try {
                    await enviarMensagem(texto, avatar.name || "");
                } catch (err) {
                    console.error("Falha ao enviar mensagem", err);
                }
            });

            escutarMensagens(async (mensagens, meuId) => {
                chatList.innerHTML = "";
                for (const m of mensagens) {
                    const li = document.createElement("li");
                    li.className = m.uid === meuId ? "me" : "other";

                    const authorLabel = sanitizeText(m.nome || (m.uid === meuId ? "Você" : "Amigo"));

                    if (m.tipo === "voz" && m.audioUrl) {
                        const safeUrl = (m.audioUrl || "").replace(/"/g, "%22");
                        const durationLabel = formatDuration(m.duracaoMs || 0);
                        li.innerHTML = `
                                    <strong>${authorLabel}:</strong> 🎤 ${durationLabel}<br>
                                    <audio controls src="${safeUrl}" preload="metadata"></audio>
                                `;
                    } else {
                        const safeText = sanitizeText(m.texto || "");
                        li.innerHTML = `<strong>${authorLabel}:</strong> ${safeText}`;
                    }
                    chatList.appendChild(li);
                }
            });
        }

        if (rankingList) {
            escutarRanking(lista => {
                rankingList.innerHTML = "";
                lista.forEach((u, i) => {
                    const { nivel, titulo } = calcularNivel(u.xp || 0);
                    const li = document.createElement("li");
                    const nome = sanitizeText(u.nome || u.name || "Amigo");
                    li.textContent = `#${i + 1} — ${nome} — Nível ${nivel} (${titulo}) — XP: ${u.xp || 0}`;
                    rankingList.appendChild(li);
                });
            });
        }
    }

    if (voiceRecord) {
        voiceRecord.addEventListener("click", () => {
            const isRecording = mediaRecorder && mediaRecorder.state === "recording";
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    if (voiceCancel) {
        voiceCancel.addEventListener("click", resetVoiceUI);
    }

    if (voiceSend) {
        voiceSend.addEventListener("click", async () => {
            if (!lastVoiceBlob) return;
            const currentUser = auth.currentUser;
            if (!currentUser) {
                if (voiceStatus) voiceStatus.textContent = "Precisa estar logado para enviar voz.";
                return;
            }

            try {
                voiceSend.disabled = true;
                if (voiceStatus) voiceStatus.textContent = "Enviando áudio...";

                const fileRef = ref(storage, `salas/${salaId}/voz/${currentUser.uid}-${Date.now()}.webm`);
                await uploadBytes(fileRef, lastVoiceBlob, { contentType: "audio/webm" });
                const url = await getDownloadURL(fileRef);

                await enviarMensagemVoz(url, lastVoiceDuration, avatar.name || "");

                const durationLabel = formatDuration(lastVoiceDuration || 0);
                if (voiceStatus) voiceStatus.textContent = "Voz enviada";
                if (chatList) {
                    const li = document.createElement("li");
                    li.className = "me temp";
                    const safeUrl = (url || "").replace(/"/g, "%22");
                    li.innerHTML = `
                        <strong>Você:</strong> 🎤 ${durationLabel}<br>
                        <audio controls src="${safeUrl}" preload="metadata"></audio>
                    `;
                    chatList.appendChild(li);
                }
            } catch (err) {
                console.error("Falha ao enviar voz", err);
                if (voiceStatus) voiceStatus.textContent = "Não deu para enviar. Tente de novo.";
            } finally {
                voiceSend.disabled = false;
                resetVoiceUI();
            }
        });
    }

    resetVoiceUI();
});
