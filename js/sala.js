document.addEventListener("DOMContentLoaded", () => {
    const savedAvatar = localStorage.getItem("popverseAvatar");
    if (!savedAvatar) {
        window.location.href = "./avatar.html";
        return;
    }

    const avatar = JSON.parse(savedAvatar || "{}");

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

    function ensureUserId() {
        let id = localStorage.getItem("popverseUserId");
        if (!id) {
            id = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
            localStorage.setItem("popverseUserId", id);
        }
        return id;
    }

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

    const userId = ensureUserId();
    const me = cloneAvatarData(avatar, { name: avatar.name || "Você", id: userId });

    const params = new URLSearchParams(window.location.search);
    const roomName = params.get("room") || "Sala";
    const roomKey = `popverseRoomParticipants_${roomName}`;

    function loadRoomParticipants() {
        try {
            const stored = JSON.parse(localStorage.getItem(roomKey) || "[]");
            if (Array.isArray(stored)) return stored;
        } catch (err) {
            return [];
        }
        return [];
    }

    function saveRoomParticipants(list) {
        localStorage.setItem(roomKey, JSON.stringify(list));
    }

    function upsertParticipant(list, participant) {
        const idx = list.findIndex(p => p.id && participant.id && p.id === participant.id);
        if (idx >= 0) {
            list[idx] = participant;
        } else {
            list.push(participant);
        }
        return list;
    }

    const initialRoomParticipants = upsertParticipant(loadRoomParticipants(), { ...me, id: userId });
    saveRoomParticipants(initialRoomParticipants);

    function renderRoomFromStorage() {
        const all = loadRoomParticipants();
        const guests = all.filter(p => p.id !== userId).map(data => cloneAvatarData(data));
        const orderedParticipants = [me, ...guests].slice(0, 4);
        renderParticipants(orderedParticipants);
        if (occupancyEl) occupancyEl.textContent = `${all.length} participante${all.length === 1 ? "" : "s"} na sala`;
    }

    renderRoomFromStorage();

    window.addEventListener("storage", evt => {
        if (evt.key === roomKey) {
            renderRoomFromStorage();
        }
    });

    function removeSelfFromRoom() {
        const remaining = loadRoomParticipants().filter(p => p.id !== userId);
        saveRoomParticipants(remaining);
    }

    window.addEventListener("beforeunload", removeSelfFromRoom);

    // Nome da sala pela URL
    const roomTitle = document.getElementById("roomTitle");
    if (roomTitle) roomTitle.textContent = roomName;

    // Chat local (simples)
    const messages = document.getElementById("messages");

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

    if (chatForm && chatInput && messages) {
        chatForm.addEventListener("submit", e => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            appendMessage(`<strong>${sanitizeText(avatar.name || "Você")}:</strong> ${sanitizeText(text)}`);
            chatInput.value = "";
            chatInput.focus();
        });
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
