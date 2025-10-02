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
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1613915617430-8ab0fd7c6baf?w=1920&q=85',
      alt: 'Elegant Fashion Model 1',
      caption: isRTL ? 'أناقة استثنائية' : 'Exceptional Elegance'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1562572159-4efc207f5aff?w=1920&q=85',
      alt: 'Stylish Fashion Model 2',
      caption: isRTL ? 'أسلوب فاخر' : 'Luxury Style'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?w=1920&q=85',
      alt: 'Sophisticated Model 3',
      caption: isRTL ? 'رقي وجمال' : 'Sophistication & Beauty'
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1616837874254-8d5aaa63e273?w=1920&q=85',
      alt: 'Luxury Jewelry Model 4',
      caption: isRTL ? 'مجوهرات فاخرة' : 'Luxury Jewelry'
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1727784892059-c85b4d9f763c?w=1920&q=85',
      alt: 'Golden Accessories Model 5',
      caption: isRTL ? 'اكسسوارات ذهبية' : 'Golden Accessories'
    },
    {
      id: 6,
      url: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?w=1920&cs=srgb&dl=pexels-photo-1926769.jpeg&fm=jpg',
      alt: 'Professional Model 6',
      caption: isRTL ? 'إطلالة احترافية' : 'Professional Look'
    },
    {
      id: 7,
      url: 'https://images.pexels.com/photos/2584269/pexels-photo-2584269.jpeg?w=1920&cs=srgb&dl=pexels-photo-2584269.jpeg&fm=jpg',
      alt: 'Elegant Style Model 7',
      caption: isRTL ? 'أناقة مميزة' : 'Distinguished Elegance'
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
      className="relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden bg-black"
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
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover object-center"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40"></div>
            
            {/* Image Caption */}
            <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 text-white z-20 max-w-xs sm:max-w-md">
              <h3 className="text-xl sm:text-2xl lg:text-4xl font-display font-bold mb-2 carousel-luxury-text drop-shadow-lg">
                {image.caption}
              </h3>
              <p className="text-sm sm:text-lg opacity-90">
                {isRTL ? 'مجموعة Auraa Luxury الفاخرة' : 'Auraa Luxury Premium Collection'}
              </p>
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

      {/* Luxury Brand Overlay */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-20 pointer-events-none px-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20 max-w-xs sm:max-w-md lg:max-w-lg">
          <div className="flex flex-col items-center">
            <div className="font-display font-black carousel-luxury-text leading-none">
              <span className="block text-3xl sm:text-5xl lg:text-7xl">Auraa</span>
              <span className="block text-[8px] sm:text-[10px] lg:text-[12px] text-gray-200 tracking-[0.25em] mt-1">LUXURY</span>
            </div>
            <p className="text-white/90 text-xs sm:text-base lg:text-lg font-light tracking-wider mt-2">
              {isRTL ? 'اكسسوارات فاخرة' : 'ACCESSORIES'}
            </p>
          </div>
        </div>
      </div>

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