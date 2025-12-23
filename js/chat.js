const chatLog = document.getElementById("chat-log");
const chatButtons = document.querySelectorAll(".chat-actions button");

function addBubble(text, role) {
    if (!chatLog) return;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;
    chatLog.appendChild(bubble);
}

function guidedReply(prompt) {
    const replies = [
        "Legal! Vamos manter a conversa segura e positiva.",
        "Ótimo ponto. Quer recomendar uma música?",
        "Adorei a vibe. Qual outro grupo você curte?",
        "Vamos combinar horários que funcionem para todos."
    ];
    const pick = replies[Math.floor(Math.random() * replies.length)];
    addBubble(prompt, "me");
    addBubble(pick, "bot");
}

chatButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const msg = btn.dataset.message || "Oi!";
        guidedReply(msg);
    });
});
