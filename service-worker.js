'use strict';

const CACHE_NAME = 'mukesh-portfolio-cache-v5';
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './favicon.svg',
  './manifest.webmanifest',
  './404.html',
  './assets/Mukesh_S_Resume.pdf',
  './assets/Mukesh_S_Contact.vcf',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/vehicle-damage.webp',
  './assets/images/loanclear-dashboard.svg',
  './assets/images/portfolio-preview.webp',
  './assets/images/portfolio-concept.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS.map(asset => new URL(asset, self.registration.scope).toString())))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('mukesh-portfolio-cache-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(new URL('./index.html', self.registration.scope).toString());
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
