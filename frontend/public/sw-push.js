/* eslint-disable no-restricted-globals */

self.addEventListener('push', function(event) {
    let data = { title: 'Tennis Buddies', body: 'You have a new notification', url: '/schedule', urgency: 'normal' };
    try {
        data = event.data.json();
    } catch (e) {
        data.body = event.data ? event.data.text() : data.body;
    }

    const isLoud = data.urgency === 'high';
    const isSilent = data.urgency === 'low';

    const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: data.url || '/schedule' },
        actions: [{ action: 'open', title: 'View Schedule' }],
        tag: isLoud ? 'bench-promotion' : 'match-update',
        renotify: isLoud,
        silent: isSilent,
        vibrate: isLoud ? [300, 100, 300, 100, 300] : isSilent ? [] : [200, 100, 200],
        requireInteraction: isLoud
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data?.url || '/schedule';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(clientList) {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
