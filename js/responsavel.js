const form = document.getElementById("parentForm");
const pinInput = document.getElementById("parentPin");
const panel = document.getElementById("parentPanel");

const storedPin = localStorage.getItem("popverseParentPin");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!storedPin) {
        localStorage.setItem("popverseParentPin", pinInput.value);
        alert("PIN criado com sucesso");
    } else if (pinInput.value !== storedPin) {
        alert("PIN incorreto");
        return;
    }

    form.style.display = "none";
    panel.style.display = "block";

    loadParentSettings();
});

function loadParentSettings() {
    const avatar = JSON.parse(localStorage.getItem("popverseAvatar") || "{}");
    document.getElementById("parentAge").value = avatar.ageGroup || "kids";
}

// Salvar configurações
document.getElementById("saveParent").addEventListener("click", () => {
    const avatar = JSON.parse(localStorage.getItem("popverseAvatar") || "{}");
    avatar.ageGroup = document.getElementById("parentAge").value;
    localStorage.setItem("popverseAvatar", JSON.stringify(avatar));
    alert("Configurações salvas");
});

// Limpar chat
document.getElementById("resetChat").addEventListener("click", () => {
    localStorage.removeItem("popverseChat");
    alert("Conversas limpas");
});

// Resetar avatar
document.getElementById("resetAvatar").addEventListener("click", () => {
    localStorage.removeItem("popverseAvatar");
    alert("Avatar removido");
});
