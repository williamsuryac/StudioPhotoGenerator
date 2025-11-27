import React, { useState } from 'react';
import { ProcessedImage, AspectRatio } from '../types';
import { ComparisonSlider } from './ComparisonSlider';
import { applyFrameAndExport, downloadBlob } from '../utils/canvasUtils';

interface ImageCardProps {
  image: ProcessedImage;
  aspectRatio: AspectRatio;
  frameUrl: string | null;
  onRegenerate: (id: string) => void;
  onRemove: (id: string) => void;
  onFullscreen: (image: ProcessedImage) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  aspectRatio, 
  frameUrl,
  onRegenerate, 
  onRemove,
  onFullscreen
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!image.generatedUrl) return;
    setIsDownloading(true);
    try {
      const blob = await applyFrameAndExport(image.generatedUrl, frameUrl);
      if (blob) {
        downloadBlob(blob, `kana-enhancer-${image.id}.png`);
      }
    } catch (e) {
      console.error("Download failed", e);
      alert("Failed to prepare download");
    } finally {
      setIsDownloading(false);
    }
  };

  const showActions = image.status === 'completed' || (image.status === 'processing' && !!image.generatedUrl);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full group">
      <div className="p-4 flex-grow relative">
        
        {/* Fullscreen Overlay Button (Top Right) - Visible on Hover */}
        <button 
            onClick={() => onFullscreen(image)}
            className="absolute top-6 right-6 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            title="View Fullscreen"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>

        {image.status === 'processing' && (
           <div className="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm rounded-t-xl">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-3"></div>
             <p className="text-sm font-medium text-gray-600 animate-pulse">Transforming...</p>
           </div>
        )}
        
        {image.status === 'error' && (
           <div className="absolute inset-0 z-20 bg-red-50 flex flex-col items-center justify-center text-center p-4 rounded-t-xl">
             <div className="text-red-500 mb-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
             </div>
             <p className="text-red-700 text-sm mb-3">{image.error || 'Processing failed'}</p>
             <button onClick={() => onRegenerate(image.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full transition-colors">
               Try Again
             </button>
           </div>
        )}

        {image.generatedUrl && (image.status === 'completed' || image.status === 'processing') ? (
          <ComparisonSlider 
            beforeImage={image.originalUrl}
            afterImage={image.generatedUrl}
            aspectRatio={aspectRatio}
          />
        ) : (
          <div className="w-full relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
             <img src={image.originalUrl} alt="Original" className="w-full h-full object-cover opacity-60" />
             {image.status === 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Pending</span>
                </div>
             )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-3 border-t border-gray-100 flex justify-between items-center">
        <button 
          onClick={() => onRemove(image.id)}
          className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
          title="Remove"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>

        <div className="flex gap-2 items-center">
             {/* Mobile-friendly fullscreen button (visible only when actions are hidden or on mobile) */}
             <button
                onClick={() => onFullscreen(image)}
                className="md:hidden text-gray-500 hover:text-gray-900 p-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
             </button>

            {showActions && (
                <>
                <button 
                    onClick={() => onRegenerate(image.id)}
                    className="text-brand-600 hover:bg-brand-50 p-2 rounded-full transition-colors"
                    title="Re-generate"
                    disabled={image.status === 'processing'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                </button>
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-2 rounded-md transition-colors disabled:opacity-50"
                    disabled={isDownloading}
                >
                    {isDownloading ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    )}
                    <span>Download</span>
                </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};