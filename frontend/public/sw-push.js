/* eslint-disable no-restricted-globals */

self.addEventListener('push', function(event) {
    let data = { title: 'Tennis Buddies', body: 'You have a new notification', url: '/schedule' };
    try {
        data = event.data.json();
    } catch (e) {
        data.body = event.data ? event.data.text() : data.body;
    }

    const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/schedule' },
        actions: [{ action: 'open', title: 'View Schedule' }]
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data?.url || '/schedule';
    event.waitUntil(clients.openWindow(url));
});
