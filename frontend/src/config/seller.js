/**
 * The seller's published identity.
 *
 * Turkish e-commerce law requires a merchant to publish, on a contact page
 * reachable from the home page: full name, tax identification number, and
 * address. iyzico checks for exactly this before approving an account —
 * «esnaf ve sanatkâr için adı ve soyadı, vergi kimlik numarası ve merkez
 * adresi» — and it is one of the two things this shop was missing.
 *
 * These are published details, not secrets: the law's whole point is that a
 * buyer can see who they are buying from. They live here so the contact page
 * and the distance-sales contract cannot drift apart — a reviewer compares the
 * two, and two different addresses on one site reads as carelessness at best.
 *
 * NOTHING HERE MAY BE INVENTED. An empty value renders as "—" and is visibly
 * missing; a plausible-looking wrong one is worse than a blank, because the
 * reviewer checks it against the owner's ID.
 */
export const SELLER = {
  legalName: 'Younis Soudi',
  // الرقم الضريبي (Vergi Kimlik Numarası) — عشرة أرقام، من المالك.
  // معلومة عامة بحكم القانون التركي: تُنشر على الموقع ولا تُعدّ سرّاً،
  // بخلاف المفاتيح وكلمات المرور التي لا تدخل هذا المستودع أبداً.
  taxNumber: '7750869742',
  // الشارع/الحيّ فقط. المدينة والدولة حقلان مستقلّان، ودمجهما هنا كان
  // ينتج «… Istanbul, Türkiye, 34500, İstanbul, Türkiye» عند التركيب.
  address: 'Pınartepe Mah.',
  // 34500 — بويوك تشكمجه بإسطنبول، وهي التي فيها حيّ بينارتيبه. وكان
  // المكتوب 45000 وهو رمز مانيسا: عنوانٌ لا يطابق الهويّة أمام مراجع
  // يقابل الاثنين.
  postalCode: '34500',
  city: 'İstanbul',
  country: 'Türkiye',
  email: 'younes.sowady2011@gmail.com',
  phone: '+90 501 371 5391',
  tradeName: 'Auraa Luxury',
};

/**
 * The address as one line, so the contact page and the contract cannot print
 * it two different ways — a reviewer reads both.
 */
export const fullAddress = () => [
  SELLER.address, SELLER.postalCode, SELLER.city, SELLER.country,
].filter(Boolean).join(', ');

/** A value for the screen, or an honest dash when it has not been provided. */
export const shown = (value) => (value && String(value).trim()) || '—';

/** True while something the law requires is still blank. */
export const missingLegalDetails = () =>
  Object.entries({ taxNumber: SELLER.taxNumber })
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);
