export function mostrarLevelUp(nivel, titulo) {
    const div = document.createElement("div");
    div.className = "levelup";
    div.textContent = `LEVEL UP! ${titulo}`;
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 2500);
}