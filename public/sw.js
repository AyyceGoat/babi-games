/**
 * Service worker minimal.
 *
 * Deux raisons d'etre :
 *  1. Chrome ne propose l'installation reelle d'une application (et non un
 *     simple raccourci) que si un service worker repond aux requetes.
 *  2. Les visuels et la police representent l'essentiel du poids : les
 *     mettre en cache rend le site utilisable sur une connexion faible,
 *     ce qui compte pour le public vise.
 *
 * Strategie :
 *  - navigation  -> reseau d'abord, cache en secours. Un nouveau deploiement
 *    Netlify est donc visible immediatement, sans page figee.
 *  - images      -> cache d'abord, elles ne changent jamais a URL constante.
 *  - reste       -> reseau d'abord avec repli cache.
 */

const VERSION = 'babi-v3';
const CACHE_COQUILLE = `${VERSION}-coquille`;
const CACHE_IMAGES = `${VERSION}-images`;

const COQUILLE = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE_COQUILLE)
      .then((c) => c.addAll(COQUILLE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // polices et CDN : on laisse passer

  // Navigation : reseau d'abord pour ne jamais figer une version.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_COQUILLE).then((c) => c.put('/index.html', copie));
          return reponse;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Images : cache d'abord, elles sont immuables a URL constante.
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(
        (enCache) =>
          enCache ||
          fetch(request).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE_IMAGES).then((c) => c.put(request, copie));
            }
            return reponse;
          })
      )
    );
    return;
  }

  e.respondWith(
    fetch(request)
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE_COQUILLE).then((c) => c.put(request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(request))
  );
});
