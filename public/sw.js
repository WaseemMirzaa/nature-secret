// Service worker for admin notifications with Firebase FCM.

self.addEventListener('install', (event) => {
  // Ensure the updated SW activates quickly.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/orders';
  const fullUrl = url.startsWith('http') ? url : self.location.origin + url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url && 'navigate' in c && c.navigate && c.focus) {
          return c.navigate(fullUrl).then(() => c.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
      return undefined;
    }),
  );
});
