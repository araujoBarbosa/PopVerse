const CACHE_NAME = "popverse-v2";
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
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        )
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then(resp => resp || fetch(e.request))
    );
});
