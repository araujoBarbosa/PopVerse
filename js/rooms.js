const roomsList = document.getElementById("rooms-list");
const reloadRooms = document.getElementById("reload-rooms");

async function loadRooms() {
    if (!roomsList) return;
    roomsList.innerHTML = "Carregando salas...";
    try {
        const res = await fetch("/data/rooms.json");
        if (!res.ok) throw new Error("Erro ao buscar salas");
        const rooms = await res.json();
        roomsList.innerHTML = rooms
            .map(room => `
        <article class="room-card">
          <h3>${room.name}</h3>
          <span>${room.topic}</span>
          <p>${room.description}</p>
        </article>
      `)
            .join("");
    } catch (err) {
        roomsList.innerHTML = "Não foi possível carregar as salas.";
    }
}

if (reloadRooms) {
    reloadRooms.addEventListener("click", loadRooms);
    loadRooms();
}
