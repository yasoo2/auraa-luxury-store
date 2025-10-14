import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';

const SEOHead = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  product = null,
  breadcrumbs = []
}) => {
  const { language, currency } = useLanguage();
  const isRTL = language === 'ar';
  
  const siteName = 'Auraa Luxury';
  const defaultTitle = isRTL ? 'Auraa Luxury - إكسسوارات فاخرة' : 'Auraa Luxury - Premium Accessories';
  const defaultDescription = isRTL 
    ? 'اكتشف مجموعة Auraa Luxury الفاخرة من الإكسسوارات الذهبية واللؤلؤية. قلادات، أقراط، أساور وساعات بأجود الخامات والتصاميم العصرية.'
    : 'Discover Auraa Luxury\'s premium collection of gold and pearl accessories. Necklaces, earrings, bracelets and watches crafted with finest materials and contemporary designs.';
  
  const finalTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const finalImage = image || '/images/auraa-luxury-og.jpg';
  
  const defaultKeywords = isRTL 
    ? 'Auraa Luxury، إكسسوارات فاخرة، قلادات ذهبية، أقراط لؤلؤ، أساور، ساعات، مجوهرات، إكسسوارات نسائية، تسوق أونلاين'
    : 'Auraa Luxury, premium accessories, gold necklaces, pearl earrings, bracelets, watches, jewelry, women accessories, online shopping';
  
  const finalKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

  // Structured Data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": finalUrl.replace(window?.location?.pathname || '', ''),
    "logo": `${finalUrl.replace(window?.location?.pathname || '', '')}/images/logo.png`,
    "description": finalDescription,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+905013715391",
      "contactType": "customer service",
      "availableLanguage": ["Arabic", "English"]
    },
    "sameAs": [
      "https://instagram.com/auraaluxury",
      "https://facebook.com/auraaluxury"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "SA",
      "addressLocality": "Riyadh"
    }
  };

  // Structured Data for Product (if applicable)
  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "brand": {
      "@type": "Brand",
      "name": siteName
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": currency,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": siteName
      }
    },
    "aggregateRating": product.rating ? {
      "@type": "AggregateRating",
      "ratingValue": product.rating.average,
      "reviewCount": product.rating.count
    } : undefined
  } : null;

  // Breadcrumb Schema
  const breadcrumbSchema = breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="language" content={language} />
      <meta name="revisit-after" content="7 days" />
      
      {/* Language and Locale */}
      <html lang={language} dir={isRTL ? 'rtl' : 'ltr'} />
      <meta property="og:locale" content={language === 'ar' ? 'ar_SA' : 'en_US'} />
      {language === 'ar' && <meta property="og:locale:alternate" content="en_US" />}
      {language === 'en' && <meta property="og:locale:alternate" content="ar_SA" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalUrl} />
      
      {/* Alternate Language URLs */}
      <link rel="alternate" hreflang="ar" href={finalUrl.replace(/\/en\//, '/ar/')} />
      <link rel="alternate" hreflang="en" href={finalUrl.replace(/\/ar\//, '/en/')} />
      <link rel="alternate" hreflang="x-default" href={finalUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalTitle} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content={finalTitle} />
      
      {/* Additional Meta Tags for E-commerce */}
      <meta name="theme-color" content="#D97706" />
      <meta name="msapplication-TileColor" content="#D97706" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      
      {/* Geo Meta Tags */}
      <meta name="geo.region" content="SA" />
      <meta name="geo.placename" content="Riyadh" />
      <meta name="geo.position" content="24.7136;46.6753" />
      <meta name="ICBM" content="24.7136, 46.6753" />
      
      {/* Currency and Pricing */}
      <meta name="price" content={product?.price || ''} />
      <meta name="priceCurrency" content={currency} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
      
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      
      {/* Preconnect to External Domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.exchangerate-api.com" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      <link rel="dns-prefetch" href="https://api.exchangerate-api.com" />
    </Helmet>
  );
};

export default SEOHead;