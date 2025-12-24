import { db, auth } from "./firebase.js";
import { getSalaId } from "./utils.js";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { enviarMensagem, escutarMensagens } from "./chat.js";
import { escutarRanking } from "./ranking.js";
import { calcularNivel } from "./levels.js";
import { carregarAvatar } from "./avatar-store.js";
import { converterParaGoogle } from "./converterConta.js";

document.addEventListener("DOMContentLoaded", async () => {
    const savedAvatar = localStorage.getItem("popverseAvatar");
    if (!savedAvatar) {
        window.location.href = "./avatar.html";
        return;
    }

    const avatar = JSON.parse(savedAvatar || "{}");

    const salaId = getSalaId();
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
            hairVariant: overrides.hairVariant || base.hairStyleVariant || pickVariant(base.hairStyle || "", "hair"),
            eyesVariant: overrides.eyesVariant || base.eyesStyleVariant || pickVariant(base.eyesStyle || "", "eyes"),
            mouthVariant: overrides.mouthVariant || base.mouthStyleVariant || pickVariant(base.mouthStyle || "", "mouth"),
            clothesVariant: overrides.clothesVariant || base.clothesStyleVariant || pickVariant(base.clothesStyle || "", "clothes"),
            accessoryVariant: overrides.accessoryVariant || base.accessoryStyleVariant || pickVariant(base.accessoryStyle || "", "acc"),
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

    if (chatUser) chatUser.textContent = avatar.name || "Avatar";
    if (chatAvatar) chatAvatar.style.backgroundColor = avatar.skinColor || "#F7A8C8";

    const hairVariant = avatar.hairStyleVariant || pickVariant(avatar.hairStyle || "", "hair");
    const eyesVariant = avatar.eyesStyleVariant || pickVariant(avatar.eyesStyle || "", "eyes");
    const mouthVariant = avatar.mouthStyleVariant || pickVariant(avatar.mouthStyle || "", "mouth");
    const clothesVariant = avatar.clothesStyleVariant || pickVariant(avatar.clothesStyle || "", "clothes");
    const accessoryVariant = avatar.accessoryStyleVariant || pickVariant(avatar.accessoryStyle || "", "acc");

    if (hairVariant) applyClass(chatHair, "hair", hairVariant);
    if (eyesVariant) applyClass(chatEyes, "eyes", eyesVariant);
    if (mouthVariant) applyClass(chatMouth, "mouth", mouthVariant);
    if (clothesVariant) applyClass(chatClothes, "clothes", clothesVariant);
    applyClass(chatAccessory, "accessory", accessoryVariant || "");

    let salaIniciada = false;

    onAuthStateChanged(auth, user => {
        if (user && !salaIniciada) {
            salaIniciada = true;
            window.userId = user.uid; // 🔥 ID ÚNICO REAL
            iniciarSala(user.uid);
        }
    });

    signInAnonymously(auth).catch(err => {
        console.error("Falha ao autenticar anonimamente", err);
    });

    async function iniciarSala(userId) {
        const me = cloneAvatarData(avatar, { name: avatar.name || "Você", id: userId });

        const roomName = salaId;

        // Presença em tempo real (Firestore)
        const onlineCountEl = document.getElementById("onlineCount");
        const presencaRef = doc(db, "salas", salaId, "presencas", userId);
        const listaRef = collection(db, "salas", salaId, "presencas");

        async function enterPresence() {
            try {
                await setDoc(
                    presencaRef,
                    {
                        id: userId,
                        online: true,
                        entrouEm: serverTimestamp(),
                        nome: avatar.name || "Você",
                        skinColor: avatar.skinColor || "#F7A8C8",
                        hairVariant,
                        eyesVariant,
                        mouthVariant,
                        clothesVariant,
                        accessoryVariant,
                        hairColor: avatar.hairColor || "#1F1F1F"
                    },
                    { merge: true }
                );
            } catch (err) {
                console.error("Falha ao registrar presença", err);
            }
        }

        async function leavePresence() {
            try {
                await deleteDoc(presencaRef);
            } catch (err) {
                // já removido ou offline; ignore
            }
        }

        await enterPresence();

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

            if (onlineCountEl) onlineCountEl.textContent = String(participants.length);
            if (occupancyEl) occupancyEl.textContent = `${participants.length}/4`;
        });

        window.addEventListener("beforeunload", () => {
            leavePresence();
        });

        // Nome da sala pela URL
        const roomTitle = document.getElementById("roomTitle");
        if (roomTitle) roomTitle.textContent = roomName;

        const messages = document.getElementById("messages");
        const chatList = document.getElementById("chatMensagens");
        const rankingList = document.getElementById("ranking");
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
                await enviarMensagem(chatInput.value || "");
                chatInput.value = "";
                chatInput.focus();
            });

            escutarMensagens(async (mensagens, meuId) => {
                chatList.innerHTML = "";
                for (const m of mensagens) {
                    const li = document.createElement("li");
                    li.className = m.uid === meuId ? "me" : "other";

                    const avatar = await carregarAvatar(m.uid);
                    const imgSrc = avatar ? `avatars/${avatar}` : "avatars/default.png";

                    li.innerHTML = `
                        <img src="${imgSrc}" class="chat-avatar" alt="avatar">
                        <span>${m.texto || ""}</span>
                    `;
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
                    const imgSrc = u.avatar ? `avatars/${u.avatar}` : "avatars/default.png";
                    li.innerHTML = `
                        <img src="${imgSrc}" class="chat-avatar" alt="avatar">
                        <span>#${i + 1} — Nível ${nivel} (${titulo}) — XP: ${u.xp || 0}</span>
                    `;
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
        voiceSend.addEventListener("click", () => {
            if (!lastVoiceBlob) return;
            const messageUrl = URL.createObjectURL(lastVoiceBlob);
            appendVoiceMessage(avatar.name || "Você", messageUrl, lastVoiceDuration);
            resetVoiceUI();
        });
    }

    resetVoiceUI();
});
