// Service Worker de ChromaAid.
// En esta versión se usa principalmente para que la app pueda registrarse como PWA.
// La estrategia actual no cachea archivos: borra caches viejos y deja que la red responda.
const CACHE_NAME = 'chromaaid-cache-v3';

// Se activa inmediatamente al instalar una nueva versión del service worker.
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Limpia caches anteriores para evitar que el navegador muestre archivos viejos.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
  );
});

// Responde cada solicitud desde la red.
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
