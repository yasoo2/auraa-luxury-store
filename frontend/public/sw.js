// Service Worker for Auraa Luxury PWA
// IMPORTANT: Auto-generated version based on deployment time
const APP_VERSION = '1.0.9';
const BUILD_TIMESTAMP = 1760994260476; // Auto-generated on each build
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
      // Take control immediately. This fires "controllerchange" in every open
      // tab, which is the single signal the page reloads on — the extra
      // SW_UPDATED broadcast that used to live here made a second reload race
      // the first, and index.js had a third on top of that.
      return self.clients.claim();
    })
  );
});

// --- Fetch ------------------------------------------------------------------
//
// Two rules this file did not follow, and each one broke something real:
//
// 1. Every path that calls respondWith MUST end in a Response. The old handler
//    returned undefined when the network failed for a non-document, and
//    returned caches.match('/offline.html') for documents — which is *also*
//    undefined whenever that page is not in the cache. The browser then reports
//    "Failed to convert value to 'Response'" and the navigation dies with a
//    hard network error instead of a page. That is what made /profile
//    unreachable.
//
// 2. Authenticated API responses must never enter Cache Storage. The old
//    handler cached anything answering 200 whose path merely *contained*
//    "/auth" or "/admin" — /api/auth/me included. Cache Storage is keyed by
//    origin, not by user: on a shared device the next person to go offline
//    would be handed the previous person's profile. The API is now not
//    intercepted at all; the browser fetches it directly.

function offlineFallback() {
  // A Response body can be read once, so build a fresh one every time.
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>غير متصل</title>'
    + '<body style="font-family:system-ui;text-align:center;padding:3rem">'
    + '<h1>لا يوجد اتصال بالإنترنت</h1><p>No internet connection</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function cachePut(key, response) {
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(key, response))
    .catch((err) => console.debug('[SW] Cache put failed:', err));
}

// Navigations: the network decides, the cached shell rescues. Cache-first here
// is what serves a stale app after a deploy, so it is deliberately not used.
async function documentResponse(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Store one shell under "/" — this SPA renders every route from it, so a
      // per-route copy would only grow the cache without adding anything.
      cachePut('/', response.clone());
    }
    return response;
  } catch (err) {
    return (await caches.match('/'))
      || (await caches.match('/offline.html'))
      || offlineFallback();
  }
}

// Static assets are content-hashed by the build, so a cache hit can be trusted
// and refreshed behind the user's back.
async function assetResponse(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          cachePut(request, response.clone());
        }
      })
      .catch(() => {/* a background refresh that fails changes nothing */});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cachePut(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // Anything not ours — the API host, fonts, analytics — is none of our
  // business, and chrome-extension: URLs cannot be cached at all.
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // The API is never intercepted and never cached. See rule 2 above.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(documentResponse(request));
    return;
  }

  event.respondWith(assetResponse(request));
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