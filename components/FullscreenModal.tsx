import React, { useEffect } from 'react';
import { ProcessedImage, AspectRatio } from '../types';
import { ComparisonSlider } from './ComparisonSlider';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ProcessedImage | null;
  aspectRatio: AspectRatio;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({ 
  isOpen, 
  onClose, 
  image, 
  aspectRatio 
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  // Determine display mode
  const hasGenerated = image.generatedUrl && (image.status === 'completed' || image.status === 'processing');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* Content Container */}
      <div 
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
      >
        <div 
            className="pointer-events-auto max-w-full max-h-full shadow-2xl overflow-hidden rounded-lg flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
            style={{ 
                // Basic responsiveness to ensure it fits on screen while maintaining ratio
                aspectRatio: aspectRatio.replace(':', '/'),
                width: aspectRatio === '16:9' || aspectRatio === '4:3' ? 'min(90vw, 140vh)' : 'auto',
                height: aspectRatio === '9:16' || aspectRatio === '3:4' ? 'min(90vh, 100vw)' : 'min(85vh, 85vw)'
            }}
        >
          {hasGenerated ? (
             <div className="w-full h-full">
                <ComparisonSlider 
                    beforeImage={image.originalUrl}
                    afterImage={image.generatedUrl!}
                    aspectRatio={aspectRatio}
                />
             </div>
          ) : (
             <img 
                src={image.originalUrl} 
                alt="Original" 
                className="w-full h-full object-contain bg-black/50" 
             />
          )}
        </div>
      </div>
      
      {/* Hint Text */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
        Press ESC to close
      </div>
    </div>
  );
};