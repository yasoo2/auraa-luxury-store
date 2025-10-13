/**
 * Google Analytics 4 (GA4) Utilities for Auraa Luxury
 * 
 * Measurement ID: G-C44D1325QM
 * 
 * This file provides wrapper functions for GA4 events tracking.
 */

/**
 * Track when a user views a product detail page
 * @param {Object} product - Product object
 * @param {string} product.id - Product ID
 * @param {string} product.name - Product name
 * @param {string} product.category - Product category
 * @param {number} product.price - Product price
 * @param {string} product.currency - Currency code (default: SAR)
 */
export const trackViewItem = (product) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('event', 'view_item', {
    currency: product.currency || 'SAR',
    value: product.price || 0,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: 1
      }
    ]
  });

  console.log('GA4: view_item tracked', product.name);
};

/**
 * Track when a user adds a product to cart
 * @param {Object} product - Product object
 * @param {string} product.id - Product ID
 * @param {string} product.name - Product name
 * @param {string} product.category - Product category
 * @param {number} product.price - Product price
 * @param {number} product.quantity - Quantity added
 * @param {string} product.currency - Currency code (default: SAR)
 */
export const trackAddToCart = (product) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('event', 'add_to_cart', {
    currency: product.currency || 'SAR',
    value: (product.price || 0) * (product.quantity || 1),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: product.quantity || 1
      }
    ]
  });

  console.log('GA4: add_to_cart tracked', product.name, 'x', product.quantity);
};

/**
 * Track when a user begins the checkout process
 * @param {Object} cart - Cart object
 * @param {Array} cart.items - Array of cart items
 * @param {number} cart.total - Total cart value
 * @param {string} cart.currency - Currency code (default: SAR)
 */
export const trackBeginCheckout = (cart) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  const items = (cart.items || []).map(item => ({
    item_id: item.id || item.product_id,
    item_name: item.name || item.product_name,
    item_category: item.category,
    price: item.price,
    quantity: item.quantity || 1
  }));

  window.gtag('event', 'begin_checkout', {
    currency: cart.currency || 'SAR',
    value: cart.total || 0,
    items: items
  });

  console.log('GA4: begin_checkout tracked', items.length, 'items, total:', cart.total);
};

/**
 * Track when a purchase is completed
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {Array} order.items - Array of order items
 * @param {number} order.total - Total order value
 * @param {number} order.shipping - Shipping cost
 * @param {number} order.tax - Tax amount
 * @param {string} order.currency - Currency code (default: SAR)
 */
export const trackPurchase = (order) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  const items = (order.items || []).map(item => ({
    item_id: item.id || item.product_id,
    item_name: item.name || item.product_name,
    item_category: item.category,
    price: item.price,
    quantity: item.quantity || 1
  }));

  window.gtag('event', 'purchase', {
    transaction_id: order.id,
    value: order.total || 0,
    currency: order.currency || 'SAR',
    shipping: order.shipping || 0,
    tax: order.tax || 0,
    items: items
  });

  console.log('GA4: purchase tracked', order.id, 'total:', order.total);
};

/**
 * Track when a user removes an item from cart
 * @param {Object} product - Product object
 * @param {string} product.id - Product ID
 * @param {string} product.name - Product name
 * @param {number} product.price - Product price
 * @param {number} product.quantity - Quantity removed
 * @param {string} product.currency - Currency code (default: SAR)
 */
export const trackRemoveFromCart = (product) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('event', 'remove_from_cart', {
    currency: product.currency || 'SAR',
    value: (product.price || 0) * (product.quantity || 1),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity || 1
      }
    ]
  });

  console.log('GA4: remove_from_cart tracked', product.name);
};

/**
 * Track custom events
 * @param {string} eventName - Event name
 * @param {Object} params - Event parameters
 */
export const trackCustomEvent = (eventName, params = {}) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('event', eventName, params);
  console.log('GA4: custom event tracked', eventName, params);
};

/**
 * Set user ID for tracking (for logged-in users)
 * @param {string} userId - User ID
 */
export const setUserId = (userId) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('config', 'G-C44D1325QM', {
    user_id: userId
  });

  console.log('GA4: user_id set', userId);
};

/**
 * Set user properties
 * @param {Object} properties - User properties
 */
export const setUserProperties = (properties) => {
  if (typeof window.gtag === 'undefined') {
    console.warn('GA4: gtag not loaded');
    return;
  }

  window.gtag('set', 'user_properties', properties);
  console.log('GA4: user_properties set', properties);
};
