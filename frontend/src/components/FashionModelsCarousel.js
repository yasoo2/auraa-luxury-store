import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

const FashionModelsCarousel = () => {
  const { isRTL } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // High-quality fashion model images - Beautiful women with elegant accessories
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
      url: 'https://images.unsplash.com/photo-1614353921776-5141cd008973?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwzfHxmYXNoaW9uJTIwbW9kZWwlMjBqZXdlbHJ5fGVufDB8fHx8MTc1OTc1MzM4Mnww&ixlib=rb-4.1.0&q=85&w=1920',
      alt_ar: 'خاتم فضي فاخر بحجر أسود',
      alt_en: 'Luxury silver ring with black gemstone',
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
      url: 'https://images.pexels.com/photos/34132253/pexels-photo-34132253.jpeg?w=1920&cs=srgb&fm=jpg',
      alt_ar: 'عارضة بفستان أحمر وعقد لؤلؤ',
      alt_en: 'Model in red dress with pearl necklace',
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
    },
    // Hijabi women with accessories
    {
      id: 14,
      url: 'https://images.unsplash.com/photo-1758140970703-2dd27a6e0fa4?w=1920&q=85',
      alt_ar: 'محجبة بحجاب أخضر وإكسسوارات فاخرة',
      alt_en: 'Hijabi woman in green hijab with luxury accessories',
      caption_ar: 'أناقة محتشمة',
      caption_en: 'Modest Elegance'
    },
    {
      id: 15,
      url: 'https://images.unsplash.com/photo-1635770607507-beb7d7972491?w=1920&q=85',
      alt_ar: 'خلخال فضي أنيق على القدم',
      alt_en: 'Elegant silver ankle bracelet',
      caption_ar: 'خلخال رقيق',
      caption_en: 'Delicate Anklet'
    },
    {
      id: 16,
      url: 'https://images.pexels.com/photos/8182320/pexels-photo-8182320.jpeg?w=1920&cs=srgb&fm=jpg',
      alt_ar: 'زنار ذهبي رقيق على الخصر',
      alt_en: 'Delicate gold waist chain',
      caption_ar: 'زنار ذهبي',
      caption_en: 'Gold Waist Chain'
    },
    {
      id: 17,
      url: 'https://images.unsplash.com/photo-1758314243385-9af94851a559?w=1920&q=85',
      alt_ar: 'محجبة بزي تقليدي وإكسسوارات',
      alt_en: 'Hijabi woman in traditional outfit with accessories',
      caption_ar: 'تراث وأناقة',
      caption_en: 'Heritage & Elegance'
    },
    {
      id: 18,
      url: 'https://images.unsplash.com/photo-1758141247275-3edd55934e4d?w=1920&q=85',
      alt_ar: 'عروس محجبة بمجوهرات فاخرة',
      alt_en: 'Bridal hijabi with luxury jewelry',
      caption_ar: 'عروس فاخرة',
      caption_en: 'Luxury Bridal'
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
      className="relative w-screen overflow-hidden bg-black"
      style={{ marginLeft: '0', marginRight: '0', maxWidth: '100vw', minHeight: '400px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image Container */}
      <div className="relative w-full">
        {modelImages.map((image, index) => (
          <div
            key={image.id}
            className={`${index === currentSlide ? 'block' : 'hidden'} transition-all duration-1000 ease-in-out`}
          >
            <picture>
              <source srcSet={`${image.url}&format=avif`} type="image/avif" />
              <source srcSet={`${image.url}&format=webp`} type="image/webp" />
              <img
                src={image.url}
                alt={isRTL ? image.alt_ar : image.alt_en}
                className="w-full h-auto object-contain object-center"
                style={{ maxHeight: '80vh' }}
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