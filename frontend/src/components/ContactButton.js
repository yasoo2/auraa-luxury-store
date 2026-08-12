import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { whatsappLink } from '../config/contact';

/**
 * A way to reach the shop that actually reaches it.
 *
 * What stood here was a 654-line "live chat" — a typing indicator, voice
 * notes, file attachments, a video-call button, a star rating at the end —
 * calling four endpoints (`/api/chat/initialize`, `/chat/audio`, `/chat/file`,
 * `/chat/rate`) that were never written on the server. All four answered 404.
 * A visitor could type a question into a shop that could not hear it, and no
 * answer was ever coming, because there was nothing on the other side and
 * nobody to staff it.
 *
 * This is smaller and true: one button that opens WhatsApp on the owner's own
 * phone, with the question already addressed. A one-person shop can answer
 * that.
 *
 * It sits above the install banner rather than under it — the widget it
 * replaces rendered beneath the page's own menus, which is the owner's other
 * complaint about it.
 */
const ContactButton = ({ subject }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const greeting = isRTL
    ? 'مرحباً، لديّ سؤال عن'
    : 'Hello, I have a question about';
  const what = subject || (isRTL ? 'متجر Auraa Luxury' : 'the Auraa Luxury store');
  const href = whatsappLink(`${greeting} ${what}`);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="contact-whatsapp"
      aria-label={isRTL ? 'تواصل معنا على واتساب' : 'Contact us on WhatsApp'}
      className="fixed bottom-24 end-4 z-30 flex items-center gap-2 rounded-full
                 bg-[#128C7E] px-4 py-3 text-white shadow-lg
                 hover:bg-[#0f7a6c] focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]
                 transition-colors"
    >
      <MessageCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold whitespace-nowrap">
        {isRTL ? 'تواصل معنا' : 'Chat with us'}
      </span>
    </a>
  );
};

export default ContactButton;
