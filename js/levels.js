export function calcularNivel(xp = 0) {
    if (xp < 50) return { nivel: 1, titulo: "Iniciante" };
    if (xp < 150) return { nivel: 2, titulo: "Explorador" };
    if (xp < 300) return { nivel: 3, titulo: "Veterano" };
    if (xp < 600) return { nivel: 4, titulo: "Elite" };
    return { nivel: 5, titulo: "Lenda" };
}
