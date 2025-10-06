import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const FashionModelsCarousel = () => {
  const { isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // High-quality fashion model images
  const modelImages = [
    // New curated images
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1647780954399-a220fd047916?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbHJ5JTIwbW9kZWx8ZW58MHx8fHwxNzU5NTQxNTQ4fDA&ixlib=rb-4.1.0&q=85&w=1920',
      alt_ar: 'عارضة بأقراط أنيقة بأسلوب تحريري فاخر',
      alt_en: 'Model with elegant earrings in luxury editorial style',
      caption_ar: 'مجوهرات فاخرة',
      caption_en: 'Luxury Jewelry'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1758716021044-37738384c00e?w=1920&q=85',
      alt_ar: 'عارضة بقطعة مجوهرات أنيقة',
      alt_en: 'Model with elegant jewelry',
      caption_ar: 'أناقة لافتة',
      caption_en: 'Striking Elegance'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1614353921776-5141cd008973?w=1920&q=85',
      alt_ar: 'تركيز على الخواتم والأكسسوارات',
      alt_en: 'Focus on rings and accessories',
      caption_ar: 'تفاصيل مبهرة',
      caption_en: 'Exquisite Details'
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1759090987847-7d2b25beb2f0?w=1920&q=85',
      alt_ar: 'عارضة بفستان أسود ومجوهرات',
      alt_en: 'Model in black dress with jewelry',
      caption_ar: 'إطلالة فاخرة',
      caption_en: 'Opulent Look'
    },
    {
      id: 5,
      url: 'https://images.pexels.com/photos/34132253/pexels-photo-34132253.jpeg?w=1920&cs=srgb&dl=pexels-photo-34132253.jpeg&fm=jpg',
      alt_ar: 'عارضة بحضور قوي مع إكسسوارات فاخرة',
      alt_en: 'Model with bold presence and luxury accessories',
      caption_ar: 'حضور لافت',
      caption_en: 'Bold Presence'
    },
    {
      id: 6,
      url: 'https://images.unsplash.com/photo-1743127187686-e6145b08658b?w=1920&q=85',
      alt_ar: 'سوار فاخر بأحجار زرقاء',
      alt_en: 'Luxury bracelet with blue gemstones',
      caption_ar: 'سوار فاخر',
      caption_en: 'Luxury Bracelet'
    },
    // Previous images kept (mapped to localized fields)
    {
      id: 7,
      url: 'https://images.unsplash.com/photo-1624708530650-15863e927ed4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTc1MzM4Mnww&ixlib=rb-4.1.0&q=85&w=1920',
      alt_ar: 'عارضة أزياء بمجوهرات تقليدية فاخرة',
      alt_en: 'Fashion model with luxury traditional jewelry',
      caption_ar: 'أناقة استثنائية',
      caption_en: 'Exceptional Elegance'
    },
    {
      id: 8,
      url: 'https://images.pexels.com/photos/34132256/pexels-photo-34132256.jpeg?w=1920&cs=srgb&fm=jpg',
      alt_ar: 'عارضة بفستان أحمر وإكسسوارات ذهبية',
      alt_en: 'Model in red dress with gold accessories',
      caption_ar: 'أسلوب فاخر',
      caption_en: 'Luxury Style'
    },
    {
      id: 9,
      url: 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=1920&q=85',
      alt_ar: 'عارضة برقي وجمال',
      alt_en: 'Sophisticated Model 3',
      caption_ar: 'رقي وجمال',
      caption_en: 'Sophistication & Beauty'
    },
    {
      id: 10,
      url: 'https://images.unsplash.com/photo-1616837874254-8d5aaa63e273?w=1920&q=85',
      alt_ar: 'عارضة مع مجوهرات فاخرة',
      alt_en: 'Luxury Jewelry Model 4',
      caption_ar: 'مجوهرات فاخرة',
      caption_en: 'Luxury Jewelry'
    },
    {
      id: 11,
      url: 'https://images.unsplash.com/photo-1727784892059-c85b4d9f763c?w=1920&q=85',
      alt_ar: 'أكسسوارات ذهبية',
      alt_en: 'Golden Accessories Model 5',
      caption_ar: 'اكسسوارات ذهبية',
      caption_en: 'Golden Accessories'
    },
    {
      id: 12,
      url: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?w=1920&cs=srgb&dl=pexels-photo-1926769.jpeg&fm=jpg',
      alt_ar: 'إطلالة احترافية',
      alt_en: 'Professional Model 6',
      caption_ar: 'إطلالة احترافية',
      caption_en: 'Professional Look'
    },
    {
      id: 13,
      url: 'https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg?w=1920&cs=srgb&dl=pexels-photo-2584269.jpeg&fm=jpg',
      alt_ar: 'أناقة مميزة',
      alt_en: 'Elegant Style Model 7',
      caption_ar: 'أناقة مميزة',
      caption_en: 'Distinguished Elegance'
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

  return (
    <div 
      className="relative w-screen h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden bg-black"
      style={{ marginLeft: '0', marginRight: '0', maxWidth: '100vw' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image Container */}
      <div className="relative w-full h-full">
        {modelImages.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            <picture>
              <source srcSet={`${image.url}&format=avif`} type="image/avif" />
              <source srcSet={`${image.url}&format=webp`} type="image/webp" />
              <img
                src={image.url}
                alt={isRTL ? image.alt_ar : image.alt_en}
                className="w-full h-full object-cover object-center"
                loading={index === currentSlide ? 'eager' : 'lazy'}
                fetchpriority={index === currentSlide ? 'high' : 'auto'}
              />
            </picture>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40"></div>
            
            {/* Image Caption (no brand text) */}
            <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 text-white z-20 max-w-xs sm:max-w-md">
              <h3 className="text-xl sm:text-2xl lg:text-4xl font-display font-bold mb-2 drop-shadow-lg">
                {isRTL ? image.caption_ar : image.caption_en}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        onClick={prevSlide}
        className={`absolute top-1/2 ${isRTL ? 'right-4' : 'left-4'} transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm hover:bg-white/40 border-white/30 text-white transition-all duration-300`}
        size="icon"
      >
        {isRTL ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </Button>

      <Button
        onClick={nextSlide}
        className={`absolute top-1/2 ${isRTL ? 'left-4' : 'right-4'} transform -translate-y-1/2 z-30 bg-white/20 backdrop-blur-sm hover:bg-white/40 border-white/30 text-white transition-all duration-300`}
        size="icon"
      >
        {isRTL ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
      </Button>

      {/* Play/Pause Button */}
      <Button
        onClick={togglePlayPause}
        className="absolute top-4 right-4 z-30 bg-white/20 backdrop-blur-sm hover:bg-white/40 border-white/30 text-white transition-all duration-300"
        size="icon"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>

      {/* Dots Navigation */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
        {modelImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white scale-125 shadow-lg'
                : 'bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/30 z-30">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-4000 ease-linear"
          style={{ 
            width: isPlaying && !isHovered ? `${((currentSlide + 1) / modelImages.length) * 100}%` : '0%'
          }}
        />
      </div>

      {/* Brand Overlay removed per request */}


      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default FashionModelsCarousel;