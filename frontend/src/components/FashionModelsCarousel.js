import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const FashionModelsCarousel = () => {
  const { isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Luxury fashion models with premium accessories - 10 exclusive images
  const modelImages = [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1567777301743-3b7ef158aadf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBmYXNoaW9uJTIwbW9kZWx8ZW58MHx8fHwxNzYwMDUyMDgxfDA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'عارضة أزياء فاخرة في بيئة راقية',
      alt_en: 'Luxury fashion model in elegant setting',
      caption_ar: 'الأناقة الكلاسيكية',
      caption_en: 'Classic Elegance'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1622080157653-830e675f14c3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBmYXNoaW9uJTIwbW9kZWx8ZW58MHx8fHwxNzYwMDUyMDgxfDA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'عارضة راقية بفستان أحمر فاخر',
      alt_en: 'Sophisticated model in luxury red dress',
      caption_ar: 'الجاذبية المثالية',
      caption_en: 'Perfect Allure'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1614999612412-3b1dbcd68e40?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBmYXNoaW9uJTIwbW9kZWx8ZW58MHx8fHwxNzYwMDUyMDgxfDA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'عارضة تحمل عقد ذهبي فاخر',
      alt_en: 'Model wearing luxury gold necklace',
      caption_ar: 'بريق الذهب',
      caption_en: 'Golden Radiance'
    },
    {
      id: 4,
      url: 'https://images.pexels.com/photos/34231676/pexels-photo-34231676.jpeg',
      alt_ar: 'عارضة أزياء بإطلالة عصرية أنيقة',
      alt_en: 'Fashion model with modern elegant look',
      caption_ar: 'الحداثة الراقية',
      caption_en: 'Modern Sophistication'
    },
    {
      id: 5,
      url: 'https://images.pexels.com/photos/34231672/pexels-photo-34231672.jpeg',
      alt_ar: 'جمال طبيعي بلمسة فاخرة',
      alt_en: 'Natural beauty with luxury touch',
      caption_ar: 'الجمال الطبيعي',
      caption_en: 'Natural Beauty'
    },
    {
      id: 6,
      url: 'https://images.unsplash.com/photo-1694062045776-f48d9b6de57e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxqZXdlbHJ5JTIwbW9kZWx8ZW58MHx8fHwxNzYwMDUyMDg5fDA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'عارضة مجوهرات بإكسسوارات ذهبية',
      alt_en: 'Jewelry model with gold accessories',
      caption_ar: 'مجوهرات استثنائية',
      caption_en: 'Exceptional Jewelry'
    },
    {
      id: 7,
      url: 'https://images.unsplash.com/photo-1652766540048-de0a878a3266?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxqZXdlbHJ5JTIwbW9kZWw=',
      alt_ar: 'أقراط أنيقة في إطار فني',
      alt_en: 'Elegant earrings in artistic frame',
      caption_ar: 'فن الأقراط',
      caption_en: 'Art of Earrings'
    },
    {
      id: 8,
      url: 'https://images.unsplash.com/photo-1590166223826-12dee1677420?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHxqZXdlbHJ5JTIwbW9kZWw=',
      alt_ar: 'عارضة بأقراط لؤلؤية فاخرة',
      alt_en: 'Model with luxury pearl earrings',
      caption_ar: 'لؤلؤ أصيل',
      caption_en: 'Authentic Pearls'
    },
    {
      id: 9,
      url: 'https://images.pexels.com/photos/34221116/pexels-photo-34221116.jpeg',
      alt_ar: 'تصوير مجوهرات احترافي',
      alt_en: 'Professional jewelry photography',
      caption_ar: 'الكمال في التفاصيل',
      caption_en: 'Perfection in Detail'
    },
    {
      id: 10,
      url: 'https://images.pexels.com/photos/620074/pexels-photo-620074.jpeg',
      alt_ar: 'مجموعة إكسسوارات فاخرة متكاملة',
      alt_en: 'Complete luxury accessories collection',
      caption_ar: 'مجموعة متكاملة',
      caption_en: 'Complete Collection'
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    if (isPlaying && !isHovered) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % modelImages.length);
      }, 4000); // Change slide every 4 seconds

      return () => clearInterval(interval);
    }
  }, [isPlaying, isHovered, modelImages.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % modelImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + modelImages.length) % modelImages.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentImage = modelImages[currentSlide];

  return (
    <div 
      className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-gradient-to-r from-black/20 to-transparent group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentImage.url}
          alt={isRTL ? currentImage.alt_ar : currentImage.alt_en}
          className="w-full h-full object-cover transition-all duration-1000 ease-in-out scale-105 hover:scale-110"
          loading="lazy"
        />
        {/* Luxury Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-transparent to-amber-900/20"></div>
        {/* Shimmer effect */}
        <div className="absolute inset-0 animate-gold-shimmer opacity-30"></div>
      </div>

      {/* Navigation Arrows - Enhanced for Mobile */}
      <button
        onClick={prevSlide}
        className={`absolute ${isRTL ? 'right-2 sm:right-4 md:right-6' : 'left-2 sm:left-4 md:left-6'} top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md text-white p-3 sm:p-3 md:p-4 rounded-full transition-all duration-300 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-10 touch-manipulation shadow-lg hover:shadow-xl min-w-[44px] min-h-[44px] flex items-center justify-center`}
        aria-label={isRTL ? 'الصورة السابقة' : 'Previous image'}
      >
        {isRTL ? <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" /> : <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />}
      </button>

      <button
        onClick={nextSlide}
        className={`absolute ${isRTL ? 'left-2 sm:left-4 md:left-6' : 'right-2 sm:right-4 md:right-6'} top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md text-white p-3 sm:p-3 md:p-4 rounded-full transition-all duration-300 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-10 touch-manipulation shadow-lg hover:shadow-xl min-w-[44px] min-h-[44px] flex items-center justify-center`}
        aria-label={isRTL ? 'الصورة التالية' : 'Next image'}
      >
        {isRTL ? <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" /> : <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />}
      </button>

      {/* Play/Pause Button - Enhanced for Mobile */}
      <button
        onClick={togglePlayPause}
        className={`absolute top-3 sm:top-4 ${isRTL ? 'left-3 sm:left-4' : 'right-3 sm:right-4'} bg-white/15 hover:bg-white/25 active:bg-white/35 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all duration-300 opacity-70 sm:opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-10 shadow-lg min-w-[40px] min-h-[40px] flex items-center justify-center`}
        aria-label={isRTL ? (isPlaying ? 'إيقاف مؤقت' : 'تشغيل') : (isPlaying ? 'Pause' : 'Play')}
      >
        {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center sm:items-end justify-center sm:justify-start p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16">
        <div className="text-white max-w-2xl animate-slide-in-left text-center sm:text-left" dir={isRTL ? 'rtl' : 'ltr'}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-3 sm:mb-4 animate-text-sparkle font-display leading-tight">
            Auraa Luxury
          </h1>
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 sm:mb-6 text-amber-200 font-light animate-fade-in-up animate-float">
            {isRTL ? currentImage.caption_ar : currentImage.caption_en}
          </h2>
          <p className="text-xs sm:text-sm md:text-base opacity-90 mb-6 sm:mb-8 leading-relaxed animate-fade-in-up max-w-lg mx-auto sm:mx-0">
            {isRTL 
              ? 'اكتشف مجموعتنا الحصرية من الإكسسوارات الفاخرة المصممة خصيصاً للمرأة العصرية'
              : 'Discover our exclusive collection of luxury accessories designed for the modern woman'
            }
          </p>
          {/* Luxury CTA Button */}
          <button className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 px-6 py-2 sm:px-8 sm:py-3 rounded-full text-white font-semibold animate-pulse-gold transition-all duration-500 hover:scale-105 shadow-xl text-sm sm:text-base">
            {isRTL ? 'تسوق الآن' : 'Shop Now'}
          </button>
        </div>
      </div>

      {/* Slide Indicators - Enhanced for Mobile Touch */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 sm:space-x-3 z-10 bg-black/20 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2 rounded-full">
        {modelImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`rounded-full transition-all duration-300 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center ${
              index === currentSlide 
                ? 'bg-white scale-110 shadow-lg' 
                : 'bg-white/40 hover:bg-white/60 active:bg-white/70'
            }`}
            aria-label={`${isRTL ? 'الانتقال للصورة' : 'Go to slide'} ${index + 1}`}
          >
            <span className={`block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
              index === currentSlide ? 'bg-amber-500' : 'bg-transparent'
            }`}></span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FashionModelsCarousel;