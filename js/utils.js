export function getSalaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "geral";
}