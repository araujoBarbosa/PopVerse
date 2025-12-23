const CACHE_NAME = "popverse-v1";
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./avatar.html",
    "./salas.html",
    "./sala.html",
    "./css/styles.css",
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
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then(resp => resp || fetch(e.request))
    );
});
