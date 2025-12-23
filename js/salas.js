document.addEventListener("DOMContentLoaded", () => {
    const savedAvatar = localStorage.getItem("popverseAvatar");

    if (!savedAvatar) {
        window.location.href = "./avatar.html";
        return;
    }

    const avatar = JSON.parse(savedAvatar || "{}");

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
