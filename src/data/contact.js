/* Business WhatsApp number: digits only, with country code, e.g. '60123456789'.
   It is visible to anyone who visits the site. While blank, WhatsApp asks the
   visitor to pick a chat, which is only useful for a demo. */
export const WHATSAPP_NUMBER = '';

export const whatsappLink = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
