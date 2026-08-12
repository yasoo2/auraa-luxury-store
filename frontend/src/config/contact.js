/**
 * The shop's own contact details, in one place.
 *
 * The WhatsApp number was written out by hand in the footer, on the contact
 * page and in the admin settings default — three copies of a number that has
 * to be right, and no way to change it without finding all three.
 *
 * These are the shop's published details, not a customer's: they belong in the
 * source the same way the store's name does. The admin Settings screen holds
 * the editable copy the backend serves; these are what the storefront falls
 * back to so a contact link is never dead.
 */
export const WHATSAPP_NUMBER = '905013715391';
export const WHATSAPP_DISPLAY = '+90 501 371 5391';

/**
 * A wa.me link that opens WhatsApp with the message already written.
 *
 * `text` is optional — when a visitor asks about a particular product, sending
 * the product's name and page with the first message saves both sides a round
 * trip of "which one?".
 */
export function whatsappLink(text) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
