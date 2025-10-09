import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const FashionModelsCarousel = () => {
  const { isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // New beautiful women with elegant accessories images
  const modelImages = [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1643236008023-dcf174afa2ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwd29tZW4lMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk5Njg3NzF8MA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'امرأة أنيقة بإكسسوارات راقية',
      alt_en: 'Elegant woman with refined accessories',
      caption_ar: 'أناقة استثنائية',
      caption_en: 'Exceptional Elegance'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1643237268922-25dbcdaf4770?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwyfHxlbGVnYW50JTIwd29tZW4lMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk5Njg3NzF8MA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'امرأة جميلة بأقراط أنيقة',
      alt_en: 'Beautiful woman with elegant earrings',
      caption_ar: 'أناقة محتشمة',
      caption_en: 'Modest Elegance'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1643237251986-c0bde5848c5b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwzfHxlbGVnYW50JTIwd29tZW4lMjBhY2Nlc3Nvcmllc3xlbnwwfHx8fDE3NTk5Njg3NzF8MA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'امرأة بعقد أنيق وإطلالة راقية',
      alt_en: 'Woman with elegant necklace and refined look',
      caption_ar: 'تفاصيل مبهرة',
      caption_en: 'Exquisite Details'
    },
    {
      id: 4,
      url: 'https://images.pexels.com/photos/34180980/pexels-photo-34180980.jpeg',
      alt_ar: 'امرأة جميلة بأسلوب عصري أنيق',
      alt_en: 'Beautiful woman with modern elegant style',
      caption_ar: 'حضور لافت',
      caption_en: 'Captivating Presence'
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1603139835562-32d47f7fdae6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxmYXNoaW9uJTIwYmVsdHxlbnwwfHx8fDE3NTk5Njg3ODV8MA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'امرأة بحزام أنيق وإطلالة عصرية',
      alt_en: 'Woman with stylish belt and modern look',
      caption_ar: 'زنار ذهبي',
      caption_en: 'Golden Belt'
    },
    {
      id: 6,
      url: 'https://images.unsplash.com/photo-1712876718948-e95fd738aeb6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwzfHxmYXNoaW9uJTIwYmVsdHxlbnwwfHx8fDE3NTk5Njg3ODV8MA&ixlib=rb-4.1.0&q=85',
      alt_ar: 'امرأة بزنار خصر أنيق وإطلالة فاخرة',
      alt_en: 'Woman with elegant waist belt and luxury look',
      caption_ar: 'زنار خصر أنيق',
      caption_en: 'Elegant Waist Belt'
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
          className="w-full h-full object-cover transition-all duration-700 ease-in-out"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 z-10`}
        aria-label={isRTL ? 'الصورة السابقة' : 'Previous image'}
      >
        {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </button>

      <button
        onClick={nextSlide}
        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 z-10`}
        aria-label={isRTL ? 'الصورة التالية' : 'Next image'}
      >
        {isRTL ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
        aria-label={isRTL ? (isPlaying ? 'إيقاف مؤقت' : 'تشغيل') : (isPlaying ? 'Pause' : 'Play')}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end justify-start p-8 md:p-12 lg:p-16">
        <div className="text-white max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 text-shadow-lg animate-fade-in">
            Auraa Luxury
          </h1>
          <h2 className="text-lg md:text-xl lg:text-2xl mb-6 text-amber-200 font-light">
            {isRTL ? currentImage.caption_ar : currentImage.caption_en}
          </h2>
          <p className="text-sm md:text-base opacity-90 mb-8 leading-relaxed">
            {isRTL 
              ? 'اكتشف مجموعتنا الحصرية من الإكسسوارات الفاخرة المصممة خصيصاً للمرأة العصرية'
              : 'Discover our exclusive collection of luxury accessories designed for the modern woman'
            }
          </p>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {modelImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`${isRTL ? 'الانتقال للصورة' : 'Go to slide'} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FashionModelsCarousel;