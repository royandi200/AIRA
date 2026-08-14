// Service worker de /myapp — solo existe para recibir notificaciones push
// (llegan aunque la app esté cerrada) y abrir /myapp al tocarlas.
// No cachea nada ni intercepta fetch: el sitio ya maneja su propio
// cache-control por header (vercel.json), no queremos un SW pisándolo.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'AIRA', body: '', url: '/myapp' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/AIRA.png',
      badge: '/AIRA.png',
      data: { url: data.url || '/myapp' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/myapp';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
