import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { cn } from '../lib/utils';

const HeartButton = ({ 
  product, 
  className = "", 
  size = "md",
  variant = "default",
  showAnimation = true 
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isFavorited = isInWishlist(product.id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showAnimation) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    
    toggleWishlist(product);
  };

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6",
    xl: "h-8 w-8"
  };

  const containerSizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5", 
    xl: "p-3"
  };

  const baseClasses = cn(
    "relative rounded-full transition-all duration-300 cursor-pointer group",
    "hover:scale-110 active:scale-95",
    containerSizeClasses[size],
    className
  );

  const iconClasses = cn(
    "transition-all duration-300",
    sizeClasses[size],
    isFavorited 
      ? "text-red-500 fill-current" 
      : "text-gray-400 group-hover:text-red-400",
    isAnimating && "animate-bounce"
  );

  const backgroundClasses = cn(
    "transition-all duration-300",
    variant === "floating" && "bg-white/90 backdrop-blur-sm shadow-lg",
    variant === "solid" && "bg-white shadow-md",
    variant === "ghost" && "hover:bg-white/20",
    "group-hover:shadow-xl"
  );

  return (
    <button
      onClick={handleClick}
      className={cn(baseClasses, backgroundClasses)}
      title={isFavorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      aria-label={isFavorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <Heart 
        className={iconClasses}
      />
      
      {/* Animated ripple effect */}
      {showAnimation && isAnimating && (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-red-300 opacity-20 animate-pulse" />
        </div>
      )}
      
      {/* Heart burst animation */}
      {showAnimation && isAnimating && isFavorited && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-red-400 animate-ping opacity-75"
              style={{
                transform: `rotate(${i * 60}deg) translateY(-20px)`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            >
              ❤️
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

export default HeartButton;