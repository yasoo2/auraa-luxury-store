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
  // ⚠️ المطلوب من المالك: الرقم الضريبي (Vergi Kimlik Numarası).
  // بلا هذا الرقم يرفض iyzico الطلب — وهو معلومة عامة بحكم القانون التركي،
  // تُنشر على الموقع ولا تُعدّ سرّاً. يُكتب هنا كما هو في الوثيقة.
  taxNumber: '',
  address: 'Pınartepe Mah., Istanbul, Türkiye',
  // ⚠️ الرمز البريدي السابق كان 45000 وهو رمز مانيسا لا إسطنبول. أُزيل بدل
  // أن يُخمَّن: المراجع يقارن العنوان بهويّة المالك.
  postalCode: '',
  city: 'İstanbul',
  country: 'Türkiye',
  email: 'younes.sowady2011@gmail.com',
  phone: '+90 501 371 5391',
  tradeName: 'Auraa Luxury',
};

/** A value for the screen, or an honest dash when it has not been provided. */
export const shown = (value) => (value && String(value).trim()) || '—';

/** True while something the law requires is still blank. */
export const missingLegalDetails = () =>
  Object.entries({ taxNumber: SELLER.taxNumber })
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);
