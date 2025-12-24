// Bump version to garantir atualização dos assets depois das mudanças no avatar
const CACHE_NAME = "popverse-v4";
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./avatar.html",
    "./salas.html",
    "./sala.html",
    "./css/styles.css",
    "./js/app.js",
    "./js/avatar.js",
    "./js/salas.js",
    "./js/sala.js",
    "./assets/icons/favicon.svg",
    "./favicon.ico",
    "./assets/img/popverse-logo.svg"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    // Aplica o novo SW imediatamente
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        )
    );
    // Assume controle dos clientes para evitar uso de SW antigo
    self.clients.claim();
});

// Para HTML/JS/CSS usamos network-first para evitar servir scripts antigos do cache
self.addEventListener("fetch", (e) => {
    const { request } = e;
    const isPageOrAsset = request.destination === "document" || request.destination === "script" || request.destination === "style";

    if (isPageOrAsset) {
        e.respondWith(
            fetch(request)
                .then(response => {
                    const respClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, respClone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Demais requisições seguem cache-first simples
    e.respondWith(
        caches.match(request).then(resp => resp || fetch(request))
    );
});
