self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'New message received' };
  }

  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have received a new message.',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.chatId || 'general-chat',
    data: {
      chatId: data.chatId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;

  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and redirect
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (chatId) {
            client.postMessage({ type: 'SELECT_CHAT', chatId });
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      // eslint-disable-next-line no-undef
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
