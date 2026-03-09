// VAPID push (commented out; use Firebase FCM later)
// self.addEventListener('push', function (event) {
//   let payload = { title: 'New order', body: '' };
//   try { if (event.data) payload = event.data.json(); } catch (_) {}
//   const opts = { body: payload.body || '', icon: '/assets/nature-secret-logo.svg', badge: '/assets/nature-secret-logo.svg', tag: 'order-' + (payload.url || Date.now()), data: { url: payload.url || '/' } };
//   event.waitUntil(self.registration.showNotification(payload.title || 'New order', opts));
// });
// self.addEventListener('notificationclick', function (event) {
//   event.notification.close();
//   const url = event.notification.data?.url || '/admin/orders';
//   const fullUrl = url.startsWith('http') ? url : self.location.origin + url;
//   event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
//     for (const c of list) { if (c.url && c.focus && c.navigate) return c.navigate(fullUrl).then(function () { return c.focus(); }); }
//     if (clients.openWindow) return clients.openWindow(fullUrl);
//   }));
// });
