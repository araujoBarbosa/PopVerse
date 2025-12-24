document.addEventListener("DOMContentLoaded", () => {
    const avatar = {
        hair: document.getElementById("hair"),
        eyes: document.getElementById("eyes"),
        mouth: document.getElementById("mouth"),
        clothes: document.getElementById("clothes"),
        accessory: document.getElementById("accessory"),
        circle: document.getElementById("avatarCircle")
    };

    function animateChange() {
        if (!avatar.circle) return;
        avatar.circle.classList.remove("is-changing");
        void avatar.circle.offsetWidth;
        avatar.circle.classList.add("is-changing");
    }

    function setEyes(style) {
        if (!avatar.eyes) return;
        avatar.eyes.className = "eyes";
        avatar.eyes.innerHTML = "";

        let cls = style || "";
        if (cls && !cls.startsWith("eyes-")) cls = `eyes-${cls}`;
        if (cls) avatar.eyes.classList.add(cls);
        if (style === "tech" || style === "eyes-tech") avatar.eyes.classList.add("eyes--tech");
        if (style === "confident" || style === "eyes-confident") avatar.eyes.classList.add("eyes--confident");
        if (style === "rebel" || style === "eyes-rebel") avatar.eyes.classList.add("eyes--rebel");
        animateChange();
    }

    function setMouth(style) {
        if (!avatar.mouth) return;
        avatar.mouth.className = "mouth";
        avatar.mouth.innerHTML = "";

        let cls = style || "";
        if (cls && !cls.startsWith("mouth-")) cls = `mouth-${cls}`;
        if (cls) avatar.mouth.classList.add(cls);
        if (cls === "mouth-soft") avatar.mouth.classList.add("mouth--soft");
        if (cls === "mouth-neutral") avatar.mouth.classList.add("mouth--neutral");
        if (cls === "mouth-friendly") avatar.mouth.classList.add("mouth--friendly");
        animateChange();
    }

    function setHair(style) {
        if (!avatar.hair) return;
        avatar.hair.className = `hair ${style || ""}`.trim();
        animateChange();
    }

    function setClothes(style) {
        if (!avatar.clothes) return;
        avatar.clothes.className = `clothes ${style || ""}`.trim();
        animateChange();
    }

    function setAccessory(style) {
        if (!avatar.accessory) return;
        avatar.accessory.className = "accessory";
        avatar.accessory.innerHTML = "";
        if (style) avatar.accessory.classList.add(style);
        animateChange();
    }

    function setSkinColor(hex) {
        if (!avatar.circle || !hex) return;
        avatar.circle.style.background = `radial-gradient(circle at 30% 20%, #dfe9ee 0%, ${hex} 45%, #7f98a3 100%)`;
        animateChange();
    }

    function setHairColor(hex) {
        if (!avatar.hair || !hex) return;
        avatar.hair.style.background = `radial-gradient(circle at 30% 20%, rgba(255,255,255,.18) 0%, ${hex} 55%, rgba(0,0,0,.55) 140%)`;
        animateChange();
    }

    const nameInput = document.getElementById("nameInput");
    const colorInput = document.getElementById("colorInput");
    const avatarName = document.getElementById("avatarName");
    const hairColorInput = document.getElementById("hairColorInput");
    const eyesButtons = document.querySelectorAll(".eyes-options button");
    const mouthButtons = document.querySelectorAll(".mouth-options button");
    const hairButtons = document.querySelectorAll(".hair-options button");
    const clothesButtons = document.querySelectorAll(".clothes-options button");
    const accessoryButtons = document.querySelectorAll(".accessory-options button");
    const ageGroup = document.getElementById("ageGroup");
    const faceButtons = document.querySelectorAll(".face-options button");
    const form = document.querySelector(".avatar-form");

    // Evita erros quando o script é carregado em páginas sem o construtor de avatar
    if (!form) return;

    function ensureUserId() {
        let id = localStorage.getItem("popverseUserId");
        if (!id) {
            id = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
            localStorage.setItem("popverseUserId", id);
        }
        return id;
    }

    function setActive(groupSelector, activeBtn) {
        document.querySelectorAll(groupSelector).forEach(b => {
            b.classList.remove("option-active");
        });
        if (activeBtn) activeBtn.classList.add("option-active");
    }

    function getVariant(el, base) {
        if (!el || !el.className) return "";
        const cls = el.className.split(" ").find(c => c.startsWith(base + "-"));
        return cls || "";
    }

    function avatarPop() {
        if (!avatar.circle) return;
        avatar.circle.animate(
            [
                { transform: "scale(1)" },
                { transform: "scale(1.05)" },
                { transform: "scale(1)" }
            ],
            {
                duration: 180,
                easing: "ease-out"
            }
        );
    }

    function presetJadsonFinal() {
        setEyes("tech");
        setMouth("neutral");
        setSkinColor("#9fb3bd");
        setHairColor("#1c1c1c");
        animateChange();
    }

    function applyFacePreset(preset) {
        if (preset === "mentor") {
            setEyes("eyes-mentor");
            setMouth("mouth-soft");
        }
        if (preset === "confident") {
            setEyes("eyes-confident");
            setMouth("mouth-2");
        }
        if (preset === "rebel") {
            setEyes("eyes-rebel");
            setMouth("mouth-3");
        }
        if (preset === "smart") {
            setEyes("eyes-smart");
            setMouth("mouth-neutral");
        }
        if (preset === "friendly") {
            setEyes("eyes-friendly");
            setMouth("mouth-soft");
        }
        setActive(".face-options button", document.querySelector(`[data-face='${preset}']`));
        animateChange();
    }

    function applyJadsonAvatar() {
        presetJadsonFinal();
    }

    // Atualiza nome em tempo real
    if (nameInput && avatarName) {
        nameInput.addEventListener("input", () => {
            avatarName.textContent = nameInput.value || "Seu nome";
            if ((nameInput.value || "").trim().toLowerCase() === "jadson") {
                applyJadsonAvatar();
            }
        });
    }

    // Atualiza cor em tempo real
    if (colorInput && avatar.circle) {
        colorInput.addEventListener("input", e => {
            setSkinColor(e.target.value);
        });
    }

    if (hairColorInput) {
        hairColorInput.addEventListener("input", e => {
            setHairColor(e.target.value);
        });
    }
    document.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        if (btn.dataset.hair) {
            setHair(btn.dataset.hair);
            setActive(".hair-options button", btn);
            avatarPop();
        }
        if (btn.dataset.eyes) {
            setEyes(btn.dataset.eyes);
            setActive(".eyes-options button", btn);
        }
        if (btn.dataset.mouth) {
            setMouth(btn.dataset.mouth);
            setActive(".mouth-options button", btn);
        }
        if (btn.dataset.clothes) {
            setClothes(btn.dataset.clothes);
            setActive(".clothes-options button", btn);
            animateChange();
        }
        if (btn.dataset.accessory !== undefined) {
            setAccessory(btn.dataset.accessory);
            setActive(".accessory-options button", btn);
        }
    });

    if (faceButtons.length) {
        faceButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                applyFacePreset(btn.dataset.face);
            });
        });
    }

    if (form) {
        form.addEventListener("submit", e => {
            e.preventDefault();

            const userId = ensureUserId();

            const avatarData = {
                id: userId,
                name: nameInput.value,
                skinColor: colorInput.value,
                hairStyleVariant: getVariant(avatar.hair, "hair"),
                hairColor: hairColorInput.value,
                eyesStyleVariant: getVariant(avatar.eyes, "eyes"),
                mouthStyleVariant: getVariant(avatar.mouth, "mouth"),
                clothesStyleVariant: getVariant(avatar.clothes, "clothes"),
                accessoryStyleVariant: getVariant(avatar.accessory, "acc"),
                ageGroup: ageGroup ? ageGroup.value : ""
            };

            localStorage.setItem("popverseAvatar", JSON.stringify(avatarData));

            if (window.popverseSaveAvatar) {
                window.popverseSaveAvatar(avatarData).catch(err => {
                    console.warn("Não foi possível salvar avatar na nuvem", err);
                });
            }

            window.location.href = "./salas.html";
        });
    }

    const savedAvatar = localStorage.getItem("popverseAvatar");

    if (savedAvatar) {
        const saved = JSON.parse(savedAvatar);

        if (!localStorage.getItem("popverseUserId")) {
            localStorage.setItem("popverseUserId", saved.id || `user-${Math.random().toString(36).slice(2)}-${Date.now()}`);
        }

        nameInput.value = saved.name || "";
        avatarName.textContent = saved.name || "Seu nome";

        if (saved.skinColor) {
            colorInput.value = saved.skinColor;
            setSkinColor(saved.skinColor);
        }

        const hairVariant = saved.hairStyleVariant || (saved.hairStyle ? saved.hairStyle.split(" ").find(c => c.startsWith("hair-")) : "");
        if (hairVariant) setHair(hairVariant);
        if (saved.hairColor) {
            hairColorInput.value = saved.hairColor;
            setHairColor(saved.hairColor);
        }

        const eyesVariant = saved.eyesStyleVariant || (saved.eyesStyle ? saved.eyesStyle.split(" ").find(c => c.startsWith("eyes-")) : "");
        if (eyesVariant) setEyes(eyesVariant);

        const mouthVariant = saved.mouthStyleVariant || (saved.mouthStyle ? saved.mouthStyle.split(" ").find(c => c.startsWith("mouth-")) : "");
        if (mouthVariant) setMouth(mouthVariant);

        const clothesVariant = saved.clothesStyleVariant || (saved.clothesStyle ? saved.clothesStyle.split(" ").find(c => c.startsWith("clothes-")) : "");
        if (clothesVariant) setClothes(clothesVariant);

        const accessoryVariant = saved.accessoryStyleVariant || (saved.accessoryStyle ? saved.accessoryStyle.split(" ").find(c => c.startsWith("acc")) : "");
        if (accessoryVariant !== undefined) setAccessory(accessoryVariant);
        if (saved.ageGroup && ageGroup) ageGroup.value = saved.ageGroup;

        setActive(".eyes-options button", document.querySelector(`[data-eyes='${getVariant(avatar.eyes, "eyes") || ""}']`));
        setActive(".mouth-options button", document.querySelector(`[data-mouth='${getVariant(avatar.mouth, "mouth") || ""}']`));
        setActive(".accessory-options button", document.querySelector(`[data-accessory='${getVariant(avatar.accessory, "acc") || ""}']`));
    } else {
        presetJadsonFinal();
    }
});
