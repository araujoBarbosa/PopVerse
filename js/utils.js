export function getSalaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "geral";
}

// Gera apelido padrão para salvar em rankings
export function getPlayerNickname() {
    let nick = localStorage.getItem("popverseApelido");
    if (!nick) {
        const random = Math.floor(100 + Math.random() * 900);
        nick = `PopStar #${random}`;
        localStorage.setItem("popverseApelido", nick);
    }
    return nick;
}