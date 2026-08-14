import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SELLER, shown, fullAddress } from '../config/seller';
import { WHATSAPP_DISPLAY } from '../config/contact';

/**
 * Mesafeli Satış Sözleşmesi — the distance-sales contract.
 *
 * Required of every Turkish online shop by the Mesafeli Sözleşmeler
 * Yönetmeliği, and named explicitly in iyzico's website criteria
 * («mesafeli satış sözleşmesi ... sitenizde bulunmalıdır»). It did not exist
 * here at all, which is one of the two gaps in this shop's application.
 *
 * Written in Turkish first on purpose: the reviewer reading it is Turkish, and
 * so is the regulator behind the requirement. An Arabic summary follows for
 * the owner and for Arabic-reading customers, and it says plainly that the
 * Turkish text is the binding one.
 *
 * This follows the articles the regulation requires — parties, subject,
 * product and price, delivery, the 14-day right of withdrawal and its
 * exceptions, default, and the competent authority for disputes. It is a
 * template built to that structure, not legal advice; the owner should read it
 * before relying on it, and it says so on the page.
 */
const Article = ({ n, title, children }) => (
  <section className="mb-6">
    <h2 className="font-bold text-gray-900 mb-2">
      {n}. {title}
    </h2>
    <div className="text-gray-700 text-sm leading-7 space-y-2">{children}</div>
  </section>
);

const Row = ({ label, value }) => (
  <div className="flex flex-wrap gap-x-2 text-sm">
    <span className="text-gray-500 min-w-[10rem]">{label}</span>
    <span className="text-gray-900" dir="ltr">{value}</span>
  </div>
);

const DistanceSalesAgreement = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" data-testid="distance-sales-agreement">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1" dir="ltr">
          Mesafeli Satış Sözleşmesi
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {isRTL ? 'عقد البيع عن بُعد' : 'Distance Sales Agreement'}
        </p>

        {/* The seller block, in the shape the regulation asks for. */}
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-8 space-y-1" dir="ltr">
          <Row label="Satıcı / Seller" value={shown(SELLER.legalName)} />
          <Row label="İşletme Adı" value={shown(SELLER.tradeName)} />
          <Row label="Vergi Kimlik No" value={shown(SELLER.taxNumber)} />
          <Row label="Adres" value={fullAddress()} />
          <Row label="E-posta" value={shown(SELLER.email)} />
          <Row label="Telefon" value={shown(SELLER.phone)} />
          <Row label="WhatsApp" value={WHATSAPP_DISPLAY} />
        </div>

        <div dir="ltr" className="text-left">
          <Article n="1" title="Taraflar">
            <p>
              İşbu sözleşme, yukarıda bilgileri yer alan SATICI ile, sipariş
              sırasında bildirdiği ad, adres ve iletişim bilgileri esas alınan
              ALICI arasında, aşağıda belirtilen hükümler çerçevesinde
              akdedilmiştir.
            </p>
          </Article>

          <Article n="2" title="Konu">
            <p>
              İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait{' '}
              <span className="font-medium">auraaluxury.com</span> internet
              sitesinden elektronik ortamda siparişini verdiği, aşağıda nitelik
              ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili
              olarak tarafların hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </Article>

          <Article n="3" title="Sözleşme Konusu Ürün ve Ödeme">
            <p>
              Ürünün türü, miktarı, marka/modeli, rengi, satış bedeli ve ödeme
              şekli, sipariş özetinde ve ALICI'ya gönderilen sipariş onayında
              yer aldığı gibidir. Listelenen ve sitede ilan edilen fiyatlar
              satış fiyatıdır. Kargo ücreti, sipariş özetinde ayrıca belirtilir.
            </p>
          </Article>

          <Article n="4" title="Teslimat">
            <p>
              Ürün, ALICI'nın sipariş sırasında bildirdiği adrese teslim edilir.
              Ürünler tedarikçi depolarından uluslararası kargo ile
              gönderilmekte olup, tahmini teslim süresi sipariş sayfasında
              belirtilir. Teslimat süresi, mücbir sebepler ve kargo
              şirketinden kaynaklanan gecikmeler hariç olmak üzere, siparişin
              onaylanmasından itibaren en geç 30 (otuz) gündür.
            </p>
            <p>
              ALICI, teslim sırasında ürünü kontrol etmekle ve hasarlı ürünü
              kargo şirketinden teslim almamakla yükümlüdür.
            </p>
          </Article>

          <Article n="5" title="Cayma Hakkı">
            <p>
              ALICI, ürünü teslim aldığı tarihten itibaren{' '}
              <span className="font-medium">14 (on dört) gün</span> içinde
              hiçbir gerekçe göstermeksizin ve cezai şart ödemeksizin
              sözleşmeden cayma hakkına sahiptir. Cayma hakkının kullanıldığına
              dair bildirim, bu süre içinde SATICI'ya yukarıdaki e-posta adresi
              veya iletişim kanalları üzerinden yazılı olarak yöneltilmelidir.
            </p>
            <p>
              Cayma hakkının kullanılması hâlinde, iade edilecek ürünün kutusu,
              ambalajı ve varsa standart aksesuarları ile birlikte eksiksiz ve
              hasarsız olarak teslim edilmesi gerekmektedir. SATICI, cayma
              bildiriminin kendisine ulaşmasından itibaren 14 gün içinde ürün
              bedelini ALICI'ya iade eder.
            </p>
          </Article>

          <Article n="6" title="Cayma Hakkının Kullanılamayacağı Hâller">
            <p>
              Mesafeli Sözleşmeler Yönetmeliği uyarınca; ALICI'nın istekleri
              doğrultusunda kişiye özel hazırlanan (isim/harf işlemeli veya
              özel ölçüde üretilen) ürünler ile, hijyen açısından iadesi uygun
              olmayacak şekilde ambalajı açılmış küpe ve benzeri ürünlerde
              cayma hakkı kullanılamaz.
            </p>
          </Article>

          <Article n="7" title="Temerrüt Hâli">
            <p>
              ALICI'nın kredi kartı ile yaptığı ödemelerde temerrüde düşmesi
              hâlinde, kart sahibi banka ile arasındaki kredi kartı sözleşmesi
              çerçevesinde faiz ödemeyi ve bankaya karşı sorumlu olmayı kabul
              eder. SATICI'nın ürünü teslim edememesi hâlinde, ALICI'nın
              ödediği bedel 14 gün içinde iade edilir.
            </p>
          </Article>

          <Article n="8" title="Yetkili Mahkeme">
            <p>
              İşbu sözleşmenin uygulanmasında, Ticaret Bakanlığı'nca ilan
              edilen değere kadar ALICI'nın yerleşim yerindeki Tüketici Hakem
              Heyetleri ile Tüketici Mahkemeleri yetkilidir.
            </p>
          </Article>

          <Article n="9" title="Yürürlük">
            <p>
              ALICI, siteden verdiği siparişi onayladığında işbu sözleşmenin
              tüm koşullarını kabul etmiş sayılır.
            </p>
          </Article>
        </div>

        {/* Arabic, for the owner and for Arabic-reading customers. */}
        <div className="mt-10 pt-8 border-t border-gray-200" dir="rtl">
          <h2 className="font-bold text-gray-900 mb-3">ملخّص بالعربية</h2>
          <ul className="text-sm text-gray-700 leading-8 list-disc ps-5 space-y-1">
            <li>البائع هو صاحب المتجر ببياناته المذكورة أعلاه، والمشتري هو من يضع الطلب ببياناته المسجّلة.</li>
            <li>الأسعار المعروضة هي أسعار البيع، وأجرة الشحن تُذكر منفصلة في ملخّص الطلب.</li>
            <li>مدّة التسليم القصوى ثلاثون يوماً من تأكيد الطلب، عدا الظروف القاهرة وتأخير شركة الشحن.</li>
            <li><strong>حقّ العدول:</strong> للمشتري أن يتراجع خلال أربعة عشر يوماً من الاستلام بلا سبب وبلا غرامة، ويُردّ المبلغ خلال أربعة عشر يوماً من وصول الإشعار.</li>
            <li>لا يسري حقّ العدول على المنتجات المصنوعة بطلب خاص، ولا على ما لا يصلح إرجاعه صحّياً بعد فتح غلافه كالأقراط.</li>
            <li>عند النزاع تختصّ لجان تحكيم المستهلك ومحاكم المستهلك في محلّ إقامة المشتري.</li>
          </ul>
          <p className="mt-4 text-xs text-gray-500 leading-6">
            النصّ التركي أعلاه هو النصّ المُلزِم قانوناً. وهذه الوثيقة صيغت على
            بنية المواد التي تفرضها لائحة العقود عن بُعد التركية، وليست استشارة
            قانونية — اقرأها قبل أن تعتمد عليها، وعدّل ما يخالف واقع متجرك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DistanceSalesAgreement;
