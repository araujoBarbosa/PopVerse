document.querySelectorAll("[data-scroll]").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = document.querySelector(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

const enterButton = document.querySelector(".home .btn.primary");

if (enterButton) {
    enterButton.addEventListener("click", () => {
        const hasAvatar = !!localStorage.getItem("popverseAvatar");
        window.location.href = hasAvatar ? "./salas.html" : "./avatar.html";
    });
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
            console.warn("SW registration failed");
        });
    });
}
