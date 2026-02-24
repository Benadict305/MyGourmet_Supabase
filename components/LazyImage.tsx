import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './ui/Icon';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(`LazyImage for ${alt} created, but not yet visible.`);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log(`LazyImage for ${alt} is now VISIBLE.`);
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      });
    });

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    return () => {
      if (placeholderRef.current) {
        observer.unobserve(placeholderRef.current);
      }
    };
  }, [alt]);

  const handleLoad = () => {
    console.log(`LazyImage for ${alt} has finished LOADING.`);
    setTimeout(() => {
        setIsLoading(false);
    }, 1000); // 1-second delay for testing
  };

  const handleError = () => {
    console.log(`LazyImage for ${alt} FAILED to load.`);
    setHasError(true);
    setIsLoading(false);
  };

  return (
    <div ref={placeholderRef} className={`relative ${className}`}>
      {(isLoading || !isVisible) && (
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
           <Icons.Utensils className="text-slate-400" />
        </div>
      )}
      {isVisible && !hasError && (
        <img 
          src={src} 
          alt={alt} 
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
          onLoad={handleLoad} 
          onError={handleError}
        />
      )}
       {hasError && (
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
          <Icons.ImageOff className="text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
