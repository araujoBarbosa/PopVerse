document.querySelectorAll("[data-scroll]").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = document.querySelector(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

const familyEnter = document.getElementById("familyEnter");
const familyCopy = document.getElementById("familyCopy");

function getFamilyLink() {
    return new URL("./sala.html?id=geral", window.location.href).href;
}

if (familyEnter) {
    familyEnter.addEventListener("click", () => {
        // Pula direto para a sala geral, garantindo mesma URL para todos.
        window.location.href = getFamilyLink();
    });
}

if (familyCopy) {
    familyCopy.addEventListener("click", async () => {
        const link = getFamilyLink();
        try {
            await navigator.clipboard.writeText(link);
            familyCopy.textContent = "Link copiado!";
            setTimeout(() => (familyCopy.textContent = "Copiar link da sala"), 1500);
        } catch (err) {
            familyCopy.textContent = "Não deu para copiar";
            setTimeout(() => (familyCopy.textContent = "Copiar link da sala"), 2000);
        }
    });
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
            console.warn("SW registration failed");
        });
    });
}
