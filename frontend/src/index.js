import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA with AUTO-UPDATE
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
        
        // AUTOMATIC UPDATE CHECKING every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Check for updates immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New version available! Auto-updating...');
              
              // AUTOMATICALLY apply update without asking user
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              
              // Show a subtle notification (optional)
              showUpdateNotification();
              
              // Reload after 1 second to apply changes
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });

  // Listen for controlling service worker change
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service Worker controller changed, reloading...');
    window.location.reload();
  });
  
  // Listen for messages from Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.log('📦 SW Update:', event.data.message, 'Version:', event.data.version);
      // Auto-reload to get new version
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  });
}

// Show a subtle update notification (optional, can be removed)
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: Arial, sans-serif;
    animation: slideIn 0.3s ease-out;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="font-size: 20px;">✨</div>
      <div>
        <div style="font-weight: bold;">تحديث جديد</div>
        <div style="font-size: 12px; opacity: 0.9;">جاري تطبيق التحديث...</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Remove after animation
  setTimeout(() => {
    notification.remove();
  }, 2000);
}
