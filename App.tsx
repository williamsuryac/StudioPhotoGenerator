
import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, ProcessedImage } from './types';
import { ImageCard } from './components/ImageCard';
import { generateProductImage, fileToBase64 } from './services/geminiService';
import { applyFrameAndExport, downloadBlob } from './utils/canvasUtils';

// Simple UUID generator
const simpleId = () => Math.random().toString(36).substring(2, 11);

// Helper to safely get API key from various environment configurations without crashing
const getEnvironmentApiKey = () => {
  try {
    // Check if process is defined (Node/Webpack/Next.js/CRA)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
    }
    // Check for Vite environment variables
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    console.warn("Error accessing environment variables:", e);
  }
  return undefined;
};

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('1:1');
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [framePreviewUrl, setFramePreviewUrl] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (frameFile) {
      const url = URL.createObjectURL(frameFile);
      setFramePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFramePreviewUrl(null);
    }
  }, [frameFile]);

  const checkApiKey = async () => {
    // 1. Check AI Studio (injected environment)
    if (window.aistudio) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        return;
      } catch (e) {
        console.error("AI Studio check failed", e);
      }
    } 
    
    // 2. Fallback: Check environment variables safely
    const envKey = getEnvironmentApiKey();
    if (envKey) {
      setHasKey(true);
    }
  };

  const handleKeySelection = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to select key via AI Studio", e);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newImages: ProcessedImage[] = files.map(file => ({
        id: simpleId(),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        status: 'pending'
      }));
      setImages(prev => [...prev, ...newImages]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFrameFile(e.target.files[0]);
    }
  };

  const removeFrame = () => {
    setFrameFile(null);
    if (frameInputRef.current) frameInputRef.current.value = '';
  };

  const processImage = async (image: ProcessedImage) => {
    // Rely on process.env.API_KEY being set (either via env vars or injected by AI Studio)
    
    setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing', error: undefined } : img));

    try {
      const base64 = await fileToBase64(image.originalFile as File);
      const generatedUrl = await generateProductImage(
        base64, 
        (image.originalFile as File).type, 
        selectedRatio
      );

      setImages(prev => prev.map(img => img.id === image.id ? { 
        ...img, 
        status: 'completed', 
        generatedUrl 
      } : img));

    } catch (err: any) {
      setImages(prev => prev.map(img => img.id === image.id ? { 
        ...img, 
        status: 'error', 
        error: err.message || "Failed to process" 
      } : img));
    }
  };

  const processAllPending = async () => {
    if (!hasKey) {
        if (window.aistudio) {
            await handleKeySelection();
        }
        return;
    }

    setIsProcessingBatch(true);
    
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
    
    await Promise.all(pendingImages.map(img => processImage(img)));
    
    setIsProcessingBatch(false);
  };

  const handleRegenerate = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img) processImage(img);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
  };

  const downloadAll = async () => {
    setIsDownloadingAll(true);
    const completedImages = images.filter(i => i.status === 'completed' && i.generatedUrl);
    
    try {
      for (const img of completedImages) {
        if (img.generatedUrl) {
           const blob = await applyFrameAndExport(img.generatedUrl, framePreviewUrl);
           if (blob) {
             downloadBlob(blob, `studio-gen-${img.id}.png`);
             await new Promise(r => setTimeout(r, 200)); 
           }
        }
      }
    } catch (e) {
      console.error("Batch download error", e);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            To use the professional studio generation features (Gemini 3 Pro), you need an API key.
          </p>
          {window.aistudio ? (
            <button 
                onClick={handleKeySelection}
                className="w-full bg-brand-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
            >
                Select API Key via AI Studio
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-left text-amber-900">
                <p className="font-semibold mb-1">API Key Missing</p>
                <p className="mb-2">If running on Vercel, please add <code>GEMINI_API_KEY</code> or <code>NEXT_PUBLIC_GEMINI_API_KEY</code> to your environment variables.</p>
                <p className="text-xs text-amber-700 mt-2">
                    Current environment: {typeof process !== 'undefined' ? 'Node-like' : 'Browser'}
                </p>
            </div>
          )}
          <div className="mt-6 text-xs text-gray-400">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
              Get an API Key
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-brand-600 to-indigo-500 p-2 rounded-lg text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">StudioGen <span className="text-brand-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 hidden sm:block">Documentation</a>
             <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
             <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="hidden sm:inline">Gemini 3 Pro Active</span>
                <span className="sm:hidden">Active</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Upload Area */}
            <div className="flex-1">
               <label className="block text-sm font-semibold text-gray-700 mb-3">1. Upload Products</label>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-brand-500 hover:bg-brand-50 transition-all cursor-pointer text-center group"
               >
                 <input 
                   type="file" 
                   multiple 
                   accept="image/*" 
                   ref={fileInputRef} 
                   className="hidden" 
                   onChange={handleImageUpload} 
                 />
                 <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-100 group-hover:text-brand-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                 </div>
                 <p className="text-sm text-gray-600 font-medium">Click to upload product photos</p>
                 <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WEBP</p>
               </div>
            </div>

            {/* Settings Area */}
            <div className="flex-1 border-l border-gray-100 pl-0 md:pl-8">
               <label className="block text-sm font-semibold text-gray-700 mb-3">2. Configuration</label>
               
               <div className="space-y-6">
                 {/* Aspect Ratio */}
                 <div>
                   <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output Ratio</span>
                   <div className="flex flex-wrap gap-2 mt-2">
                     {(['1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map(ratio => (
                       <button
                         key={ratio}
                         onClick={() => setSelectedRatio(ratio)}
                         className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                           selectedRatio === ratio 
                             ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium ring-1 ring-brand-500' 
                             : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                         }`}
                       >
                         {ratio}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Frame Upload */}
                 <div>
                   <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Frame Overlay (Optional)</span>
                   <div className="mt-2 flex items-center gap-3">
                      <button 
                        onClick={() => frameInputRef.current?.click()}
                        className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                         {frameFile ? 'Change Frame' : 'Upload Frame'}
                      </button>
                      <input 
                        type="file" 
                        accept="image/png" 
                        ref={frameInputRef} 
                        className="hidden" 
                        onChange={handleFrameUpload} 
                      />
                      {frameFile && (
                        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100">
                          <span className="truncate max-w-[100px]">{frameFile.name}</span>
                          <button onClick={removeFrame} className="text-indigo-400 hover:text-indigo-900">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      )}
                   </div>
                   <p className="text-xs text-gray-400 mt-1.5">Upload a transparent PNG to overlay on generated images.</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
             <div className="text-sm text-gray-500">
               {images.length} images uploaded ({images.filter(i => i.status === 'completed').length} completed)
             </div>
             <div className="flex gap-3">
               <button 
                 onClick={processAllPending}
                 disabled={images.length === 0 || isProcessingBatch || images.every(i => i.status === 'completed')}
                 className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-gray-200"
               >
                 {isProcessingBatch ? (
                   <>
                     <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                     Processing...
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                     Generate All
                   </>
                 )}
               </button>
             </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map(img => (
              <div key={img.id} className="h-96">
                <ImageCard 
                  image={img} 
                  aspectRatio={selectedRatio}
                  frameUrl={framePreviewUrl}
                  onRegenerate={handleRegenerate}
                  onRemove={removeImage}
                />
              </div>
            ))}
          </div>
        ) : (
           <div className="text-center py-20">
             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
             </div>
             <h3 className="text-lg font-medium text-gray-900">No images yet</h3>
             <p className="text-gray-500 mt-1">Upload product photos to get started</p>
           </div>
        )}
      </main>

      {/* Floating Batch Actions */}
      {images.some(i => i.status === 'completed') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-bounce-in">
          <span className="text-sm font-medium text-gray-700">
            {images.filter(i => i.status === 'completed').length} Ready
          </span>
          <div className="h-4 w-px bg-gray-300"></div>
          <button 
            onClick={downloadAll}
            disabled={isDownloadingAll}
            className="flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-800 transition-colors"
          >
            {isDownloadingAll ? 'Downloading...' : 'Download All'}
            {!isDownloadingAll && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
