import { ensureAnonymousAuth } from "./firebase.js";
import { carregarAvatar } from "./avatar-store.js";

document.addEventListener("DOMContentLoaded", async () => {
    const userName = document.getElementById("userName");
    const avatarCircle = document.getElementById("userAvatar");
    const userHair = document.getElementById("userHair");
    const userEyes = document.getElementById("userEyes");
    const userMouth = document.getElementById("userMouth");
    const userClothes = document.getElementById("userClothes");
    const userAccessory = document.getElementById("userAccessory");

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

    async function carregarAvatarOuNavegar() {
        const localAvatar = tryParseAvatar(localStorage.getItem("popverseAvatar"));
        if (localAvatar) return localAvatar;

        // Sem localStorage, tenta resgatar da nuvem para evitar loop de criação
        const user = await ensureAnonymousAuth();
        if (!user) return null;

        try {
            const cloudAvatar = await carregarAvatar(user.uid);
            if (cloudAvatar) {
                localStorage.setItem("popverseAvatar", JSON.stringify(cloudAvatar));
                return cloudAvatar;
            }
        } catch (err) {
            console.warn("Não foi possível carregar avatar da nuvem", err);
        }

        return null;
    }

    const avatar = await carregarAvatarOuNavegar();

    if (!avatar) {
        window.location.href = "./avatar.html";
        return;
    }

    if (userName) userName.textContent = avatar.name || "Avatar";
    if (avatarCircle) avatarCircle.style.backgroundColor = avatar.skinColor || "#F7A8C8";

    const hairVariant = avatar.hairStyleVariant || pickVariant(avatar.hairStyle || "", "hair");
    const eyesVariant = avatar.eyesStyleVariant || pickVariant(avatar.eyesStyle || "", "eyes");
    const mouthVariant = avatar.mouthStyleVariant || pickVariant(avatar.mouthStyle || "", "mouth");
    const clothesVariant = avatar.clothesStyleVariant || pickVariant(avatar.clothesStyle || "", "clothes");
    const accessoryVariant = avatar.accessoryStyleVariant || pickVariant(avatar.accessoryStyle || "", "acc");

    applyClass(userHair, "hair", hairVariant);
    applyClass(userEyes, "eyes", eyesVariant);
    applyClass(userMouth, "mouth", mouthVariant);
    applyClass(userClothes, "clothes", clothesVariant);
    applyClass(userAccessory, "accessory", accessoryVariant);
});
