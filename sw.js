'use strict';

const CACHE_NAME = 'vedator-question-matcher-app-v8';
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app-1.js",
  "./concept-dedupe.js",
  "./app-2.js",
  "./app-3.js",
  "./app-4.js",
  "./repository-sync.js",
  "./app-5.js",
  "./thematic-scoring.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))));
    return;
  }

  if (sameOrigin) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'api.github.com') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});
