// Service Worker for Auraa Luxury PWA
const CACHE_NAME = 'auraa-luxury-v1.0.1';
const DATA_CACHE_NAME = 'auraa-data-v1.0.1';

// Files to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/manifest.json',
  '/offline.html'
  // Static assets are cached dynamically during runtime
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/categories',
  '/api/products',
  '/api/featured-products'
];

// Install Event - Cache static files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        self.skipWaiting();
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  self.clients.claim();
});

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the request is successful, clone and cache the response
          if (response && response.status === 200 && response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            }).catch((err) => {
              console.debug('[SW] Failed to cache API response:', err);
            });
          }
          return response;
        })
        .catch((error) => {
          console.debug('[SW] API fetch failed:', error);
          // If network fails, try to get from cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(JSON.stringify({
              error: 'Network unavailable',
              offline: true
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  // Handle all other requests
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses or chrome-extension requests
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Skip caching for chrome-extension and unsupported schemes
            const requestUrl = new URL(request.url);
            if (requestUrl.protocol === 'chrome-extension:' || requestUrl.protocol === 'about:') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              })
              .catch((err) => {
                // Silently fail cache operations for unsupported requests
                console.debug('Cache put failed:', err);
              });
            
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
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