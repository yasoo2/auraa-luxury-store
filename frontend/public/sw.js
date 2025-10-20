// Service Worker for Auraa Luxury PWA
// IMPORTANT: Auto-generated version based on deployment time
const APP_VERSION = '1.0.9';
const BUILD_TIMESTAMP = Date.now(); // Auto-generated on each build
const CACHE_NAME = `auraa-luxury-v${APP_VERSION}-${BUILD_TIMESTAMP}`;
const DATA_CACHE_NAME = `auraa-data-v${APP_VERSION}-${BUILD_TIMESTAMP}`;

// AGGRESSIVE CACHE INVALIDATION
// This ensures users ALWAYS get the latest version

// Files to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/manifest.json',
  '/offline.html'
  // Static assets are cached dynamically during runtime
];

// Install Event - Force immediate activation
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker] Install v${APP_VERSION} (${BUILD_TIMESTAMP})`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        // FORCE immediate activation (skip waiting)
        return self.skipWaiting();
      })
  );
});

// Activate Event - Take control immediately and clean ALL old caches
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker] Activate v${APP_VERSION} (${BUILD_TIMESTAMP})`);
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Delete ALL caches except current ones
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      // FORCE take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to reload for new version
      return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: APP_VERSION,
              timestamp: BUILD_TIMESTAMP,
              message: 'New version available - reloading...'
            });
          });
        });
    })
  );
});

// Fetch Event - NETWORK FIRST strategy for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return; // Let non-GET requests pass through
  }
  
  const url = new URL(request.url);
  
  // CRITICAL: For API and dynamic routes, ALWAYS fetch from network first
  // This prevents showing stale admin UI or data
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('/admin') ||
      url.pathname.includes('/auth') ||
      url.pathname.includes('.json') ||
      url.pathname.includes('.js') ||
      url.pathname.includes('.css')) {
    
    // NETWORK FIRST - Always try network, fallback to cache only if offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache))
              .catch(err => console.debug('[SW] Cache put failed:', err));
          }
          return response;
        })
        .catch(() => {
          // Only use cache if network fails (offline)
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache (offline):', url.pathname);
              return cachedResponse;
            }
            // Return offline page for navigation
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            return new Response('Network error', { status: 503 });
          });
        })
    );
    return;
  }
  
  // For other static assets, use cache first (faster)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache but update in background
          fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, response))
                  .catch(err => console.debug('[SW] Background update failed:', err));
              }
            })
            .catch(() => {/* Ignore background update failures */});
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const requestUrl = new URL(request.url);
            if (requestUrl.protocol === 'chrome-extension:' || requestUrl.protocol === 'about:') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache))
              .catch((err) => console.debug('Cache put failed:', err));
            
            return response;
          })
          .catch(() => {
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartData());
  }
  
  if (event.tag === 'wishlist-sync') {
    event.waitUntil(syncWishlistData());
  }
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrderData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let notificationData = {};
  
  if (event.data) {
    notificationData = event.data.json();
  }
  
  const options = {
    body: notificationData.body || 'You have a new notification from Auraa Luxury',
    icon: notificationData.icon || '/favicon.svg',
    badge: notificationData.badge || '/favicon.svg',
    image: notificationData.image,
    data: notificationData.data,
    actions: [
      {
        action: 'view',
        title: notificationData.lang === 'ar' ? 'عرض' : 'View'
      },
      {
        action: 'dismiss',
        title: notificationData.lang === 'ar' ? 'إغلاق' : 'Dismiss'
      }
    ],
    tag: notificationData.tag || 'auraa-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    dir: notificationData.lang === 'ar' ? 'rtl' : 'ltr',
    lang: notificationData.lang || 'en'
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Auraa Luxury',
      options
    )
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to the relevant page
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }
          
          // If app is not open, open it
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('[ServiceWorker] Notification dismissed');
  }
});

// Helper functions for background sync
async function syncCartData() {
  try {
    const pendingActions = await getFromIndexedDB('pendingCartActions');
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/cart', {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${action.token}`
          },
          body: JSON.stringify(action.data)
        });
        
        // Remove successful action from pending list
        await removeFromIndexedDB('pendingCartActions', action.id);
      } catch (error) {
        console.log('[ServiceWorker] Cart sync failed for action', action.id);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Cart sync error', error);
  }
}

async function syncWishlistData() {
  try {
    const pendingActions = await getFromIndexedDB('pendingWishlistActions');
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/wishlist', {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${action.token}`
          },
          body: JSON.stringify(action.data)
        });
        
        await removeFromIndexedDB('pendingWishlistActions', action.id);
      } catch (error) {
        console.log('[ServiceWorker] Wishlist sync failed for action', action.id);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Wishlist sync error', error);
  }
}

async function syncOrderData() {
  try {
    const pendingOrders = await getFromIndexedDB('pendingOrders');
    
    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.token}`
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          await removeFromIndexedDB('pendingOrders', order.id);
          
          // Show success notification
          self.registration.showNotification('Order Placed Successfully', {
            body: 'Your order has been successfully placed!',
            icon: '/favicon.svg',
            tag: 'order-success'
          });
        }
      } catch (error) {
        console.log('[ServiceWorker] Order sync failed for order', order.id);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Order sync error', error);
  }
}

// IndexedDB helper functions
function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AuraaLuxuryDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingCartActions')) {
        db.createObjectStore('pendingCartActions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingWishlistActions')) {
        db.createObjectStore('pendingWishlistActions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingOrders')) {
        db.createObjectStore('pendingOrders', { keyPath: 'id' });
      }
    };
  });
}

function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AuraaLuxuryDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// App update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});