import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Gem,
  MessageCircle,
  PackageSearch,
  Ruler,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const pageContent = {
  shipping: {
    icon: Truck,
    ar: {
      title: 'معلومات الشحن',
      intro: 'نساعدك على فهم خطوات الشحن ومتابعة طلبك من تأكيد البيانات حتى وصول تحديثات التتبع.',
      sections: [
        {
          title: 'قبل تأكيد الطلب',
          text: 'راجعي الاسم ورقم الهاتف والعنوان والمدينة والدولة بعناية. تستخدم هذه البيانات لتجهيز الطلب وإرسال التحديثات المرتبطة به.',
          icon: ShieldCheck,
        },
        {
          title: 'تجهيز الطلب والشحن',
          text: 'تظهر تفاصيل الطلب وطريقة الدفع في صفحة التأكيد. قد تختلف المدة المتوقعة باختلاف الوجهة وحالة الشحن، لذلك راجعي معلومات الطلب المحدثة دائماً.',
          icon: PackageSearch,
        },
        {
          title: 'متابعة الطلب',
          text: 'استخدمي رقم الطلب أو رقم التتبع في صفحة تتبع الطلب لرؤية الحالة المتاحة. عند الحاجة، أرسلي رقم الطلب في نموذج التواصل لتسهيل المساعدة.',
          icon: MessageCircle,
        },
      ],
      checklistTitle: 'نصائح لتجربة شحن أوضح',
      checklist: [
        'تأكدي من صحة رقم الهاتف قبل إتمام الطلب.',
        'احتفظي برقم الطلب الظاهر في صفحة التأكيد.',
        'راجعي صفحة التتبع عند استلام رقم التتبع.',
        'تواصلي معنا عند وجود اختلاف في بيانات الطلب أو حالة الشحن.',
      ],
      cta: 'تتبّع الطلب',
      contact: 'تواصلي معنا',
    },
    en: {
      title: 'Shipping Information',
      intro: 'Understand the shipping steps and follow your order from confirmation through tracking updates.',
      sections: [
        {
          title: 'Before placing an order',
          text: 'Review the recipient name, phone number, address, city, and country carefully. These details are used to prepare the order and send related updates.',
          icon: ShieldCheck,
        },
        {
          title: 'Order preparation and shipping',
          text: 'Order details and the payment method appear on the confirmation page. Timing can vary by destination and shipping status, so always refer to the current order information.',
          icon: PackageSearch,
        },
        {
          title: 'Order tracking',
          text: 'Use the order number or tracking number on the tracking page to view the available status. Include your order number in the contact form whenever you need help.',
          icon: MessageCircle,
        },
      ],
      checklistTitle: 'Tips for clearer shipping updates',
      checklist: [
        'Confirm that the phone number is correct before completing the order.',
        'Keep the order number shown on the confirmation page.',
        'Check the tracking page once a tracking number is available.',
        'Contact us if order details or shipping status need clarification.',
      ],
      cta: 'Track your order',
      contact: 'Contact us',
    },
  },
  size: {
    icon: Ruler,
    ar: {
      title: 'دليل المقاسات',
      intro: 'استخدمي هذه الإرشادات العامة لاختيار المقاس المناسب، ثم راجعي وصف المنتج قبل إتمام الطلب لأن الخيارات تختلف من قطعة إلى أخرى.',
      sections: [
        {
          title: 'الخواتم',
          text: 'قيسي القطر الداخلي لخاتم يناسبك أو محيط الإصبع بشريط ورقي مرن. قارني القياس بوصف المنتج، ولا تشدي الشريط أكثر من اللازم.',
          icon: Gem,
        },
        {
          title: 'الأساور والساعات',
          text: 'قيسي محيط المعصم فوق العظمة مباشرة، ثم أضيفي مساحة مريحة للحركة حسب أسلوبك المفضل. راجعي طول السوار أو الحزام في تفاصيل المنتج.',
          icon: Ruler,
        },
        {
          title: 'القلادات والأقراط',
          text: 'راجعي طول السلسلة أو أبعاد القطعة في الوصف والصور. تساعد مقارنة الأبعاد بقطعة تملكينها بالفعل على تصور المقاس بصورة أدق.',
          icon: Sparkles,
        },
      ],
      checklistTitle: 'قبل إتمام الطلب',
      checklist: [
        'اقرئي وصف المقاس الخاص بالمنتج المختار.',
        'استخدمي وحدة القياس نفسها عند المقارنة.',
        'راجعي الصور والقياسات بعناية عند شراء هدية.',
        'تواصلي معنا قبل الطلب إن احتجتِ إلى توضيح إضافي.',
      ],
      cta: 'استعرضي المنتجات',
      contact: 'تواصلي معنا',
    },
    en: {
      title: 'Size Guide',
      intro: 'Use these general guides to choose a suitable size, then review the product description before ordering because options vary by item.',
      sections: [
        {
          title: 'Rings',
          text: 'Measure the inner diameter of a ring that fits or the finger circumference with a flexible paper strip. Compare it with the product details without pulling the strip too tightly.',
          icon: Gem,
        },
        {
          title: 'Bracelets and watches',
          text: 'Measure your wrist just above the wrist bone, then allow comfortable movement based on your preference. Review the bracelet or strap length in the product details.',
          icon: Ruler,
        },
        {
          title: 'Necklaces and earrings',
          text: 'Review chain length or item dimensions in the description and photos. Comparing dimensions with an item you own can help you picture the size more accurately.',
          icon: Sparkles,
        },
      ],
      checklistTitle: 'Before completing an order',
      checklist: [
        'Read the size details for the selected product.',
        'Use the same measurement unit when comparing.',
        'Review photos and dimensions carefully when buying a gift.',
        'Contact us before ordering if you need more clarification.',
      ],
      cta: 'Browse products',
      contact: 'Contact us',
    },
  },
  care: {
    icon: Sparkles,
    ar: {
      title: 'تعليمات العناية',
      intro: 'اتبعي هذه الإرشادات العامة للمساعدة على الحفاظ على مظهر إكسسواراتك. راجعي أيضاً أي تعليمات خاصة مذكورة في وصف المنتج.',
      sections: [
        {
          title: 'الاستخدام اليومي',
          text: 'ضعي الإكسسوارات بعد العطر ومستحضرات التجميل، وأزيليها قبل السباحة أو الاستحمام أو ممارسة الأنشطة التي قد تعرضها للرطوبة أو الاحتكاك.',
          icon: ShieldCheck,
        },
        {
          title: 'التنظيف',
          text: 'استخدمي قطعة قماش ناعمة وجافة للتنظيف اللطيف. تجنبي المنظفات القاسية أو المواد الكاشطة ما لم يوصِ وصف المنتج بخلاف ذلك.',
          icon: Sparkles,
        },
        {
          title: 'الحفظ',
          text: 'احتفظي بكل قطعة في مكان جاف وبعيداً عن أشعة الشمس المباشرة. يساعد الفصل بين القطع على تقليل الخدوش والتشابك.',
          icon: Gem,
        },
      ],
      checklistTitle: 'متى تتواصلين معنا؟',
      checklist: [
        'عند وجود سؤال عن مادة أو طلاء قطعة محددة.',
        'عند الحاجة إلى توضيح العناية بمنتج وصل حديثاً.',
        'عند ملاحظة مشكلة في المنتج بعد الاستلام.',
        'عند الحاجة إلى مراجعة سياسة الإرجاع أو الاستبدال.',
      ],
      cta: 'سياسة الإرجاع',
      contact: 'تواصلي معنا',
    },
    en: {
      title: 'Care Instructions',
      intro: 'Follow these general guidelines to help preserve the appearance of your accessories. Also review any product-specific care notes in the description.',
      sections: [
        {
          title: 'Everyday use',
          text: 'Put accessories on after perfume and cosmetics, and remove them before swimming, showering, or activities that may expose them to moisture or friction.',
          icon: ShieldCheck,
        },
        {
          title: 'Cleaning',
          text: 'Use a soft, dry cloth for gentle cleaning. Avoid harsh cleaners or abrasive materials unless the product description specifically recommends otherwise.',
          icon: Sparkles,
        },
        {
          title: 'Storage',
          text: 'Store each item in a dry place away from direct sunlight. Keeping pieces separate helps reduce scratches and tangling.',
          icon: Gem,
        },
      ],
      checklistTitle: 'When should you contact us?',
      checklist: [
        'If you have a question about an item’s material or finish.',
        'If you need care clarification for a newly received product.',
        'If you notice an issue with a product after delivery.',
        'If you need to review the return or exchange policy.',
      ],
      cta: 'Return policy',
      contact: 'Contact us',
    },
  },
};

const HelpPage = ({ pageKey }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'he';
  const page = pageContent[pageKey];
  const t = page[isRTL ? 'ar' : 'en'];
  const PageIcon = page.icon;
  const primaryPath = pageKey === 'shipping' ? '/order-tracking' : pageKey === 'size' ? '/products' : '/return-policy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <section className="bg-gradient-to-r from-brand to-accent text-white py-14 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg">
            <PageIcon className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">{t.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">{t.intro}</p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {t.sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <article key={section.title} className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <SectionIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">{t.checklistTitle}</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {t.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-brand" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-8 text-center sm:flex-row">
          <Link to={primaryPath} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-amber-300">
            {t.cta}
          </Link>
          <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">
            {t.contact}
          </Link>
        </section>
      </section>
    </div>
  );
};

export const ShippingInfo = () => <HelpPage pageKey="shipping" />;
export const SizeGuide = () => <HelpPage pageKey="size" />;
export const CareInstructions = () => <HelpPage pageKey="care" />;
