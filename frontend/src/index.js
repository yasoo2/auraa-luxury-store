import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./config/axios"; // Import axios configuration globally

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the service worker.
//
// Exactly one thing reloads the page: the moment a new worker takes control.
// There used to be three racing each other — a timer after "installed", a
// SW_UPDATED message from the worker, and controllerchange — so a single
// deploy could reload a shopper mid-checkout more than once.
if ('serviceWorker' in navigator) {
  // No controller on a first visit: the worker claims the page a moment after
  // it installs, and reloading then would restart every visit for nothing.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    showUpdateNotification();
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        setInterval(() => registration.update(), 60000);
      })
      .catch((registrationError) => {
        console.warn('Service worker registration failed:', registrationError);
      });
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
