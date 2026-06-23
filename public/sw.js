// public/sw.js

// Constants for caching
const CACHE_NAME = 'eresto-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-icon.png'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Install complete, skipping waiting...');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients...');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - For offline support
// ============================================
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the response for future use
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch error:', error);
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// ============================================
// PUSH EVENT - Handle push notifications
// ============================================
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received');
  
  // Check if data exists
  if (!event.data) {
    console.log('[Service Worker] No push data received');
    return;
  }

  try {
    // Parse the push data
    let data;
    try {
      data = event.data.json();
      console.log('[Service Worker] Push data parsed:', data);
    } catch (parseError) {
      // If data is not JSON, use it as text
      console.warn('[Service Worker] Push data is not JSON, using as text');
      data = {
        title: 'New Notification',
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-icon.png',
        url: '/',
        timestamp: Date.now()
      };
    }

    // Validate required fields
    if (!data.title && !data.body) {
      console.warn('[Service Worker] Push data missing title and body');
      data = {
        ...data,
        title: data.title || 'Notification',
        body: data.body || 'You have a new notification'
      };
    }

    // Check notification permission
    if (!(self.Notification && self.Notification.permission === 'granted')) {
      console.log('[Service Worker] Notifications not granted');
      return;
    }

    // Prepare notification options
    const options = {
      body: data.body || 'New update available!',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-icon.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        timestamp: data.timestamp || Date.now(),
        tag: data.tag || 'notification',
        actions: data.actions || []
      },
      tag: data.tag || `notification-${Date.now()}`,
      renotify: data.renotify || false,
      silent: data.silent || false,
      requireInteraction: data.requireInteraction || false,
      actions: [
        {
          action: 'open',
          title: '🔗 Open'
        },
        {
          action: 'close',
          title: '❌ Dismiss'
        }
      ]
    };

    // Add custom actions if provided
    if (data.actions && Array.isArray(data.actions)) {
      options.actions = data.actions;
    }

    // Show the notification
    console.log('[Service Worker] Showing notification:', data.title);
    event.waitUntil(
      self.registration.showNotification(data.title || 'Eresto Notification', options)
    );

  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
    
    // Show a fallback notification if possible
    try {
      if (self.Notification && self.Notification.permission === 'granted') {
        event.waitUntil(
          self.registration.showNotification('Eresto Notification', {
            body: 'You have a new notification',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-icon.png',
            data: { url: '/' }
          })
        );
      }
    } catch (fallbackError) {
      console.error('[Service Worker] Fallback notification failed:', fallbackError);
    }
  }
});

// ============================================
// NOTIFICATION CLICK EVENT
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Get the URL to open
  let targetUrl = '/';
  try {
    if (event.notification.data && event.notification.data.url) {
      targetUrl = event.notification.data.url;
    }
  } catch (error) {
    console.warn('[Service Worker] Error getting notification URL:', error);
  }

  // Handle action clicks
  const action = event.action;
  console.log('[Service Worker] Notification action:', action);

  if (action === 'close') {
    console.log('[Service Worker] Notification dismissed');
    return;
  }

  // Open or focus the target URL
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      console.log('[Service Worker] Found clients:', clientList.length);
      
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          console.log('[Service Worker] Focusing existing client:', targetUrl);
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window:', targetUrl);
        return clients.openWindow(targetUrl);
      }
    })
    .catch((error) => {
      console.error('[Service Worker] Error handling notification click:', error);
    })
  );
});

// ============================================
// MESSAGE EVENT - Handle messages from clients
// ============================================
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping waiting...');
    self.skipWaiting();
  }
});

// ============================================
// ERROR HANDLING
// ============================================
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

console.log('[Service Worker] Service Worker loaded successfully');