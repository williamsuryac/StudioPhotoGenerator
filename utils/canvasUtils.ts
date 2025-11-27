import JSZip from 'jszip';

/**
 * Composes a frame overlay on top of a product image.
 * Returns a Promise resolving to a Blob.
 */
export const applyFrameAndExport = async (
    productImageUrl: string,
    frameImageUrl: string | null
  ): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
  
      const productImg = new Image();
      productImg.crossOrigin = "anonymous";
      
      productImg.onload = () => {
        canvas.width = productImg.naturalWidth;
        canvas.height = productImg.naturalHeight;
  
        // Draw product image
        ctx.drawImage(productImg, 0, 0);
  
        if (frameImageUrl) {
          const frameImg = new Image();
          frameImg.crossOrigin = "anonymous";
          frameImg.onload = () => {
            // Draw frame stretched to fit (or maintain aspect ratio depending on req, strictly fitting for now)
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => resolve(blob), 'image/png');
          };
          frameImg.onerror = (e) => reject(e);
          frameImg.src = frameImageUrl;
        } else {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        }
      };
      
      productImg.onerror = (e) => reject(e);
      productImg.src = productImageUrl;
    });
  };
  
  export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  export const downloadZip = async (images: { blob: Blob; name: string }[]) => {
    const zip = new JSZip();
    
    // Add images to folder
    images.forEach((img) => {
      zip.file(img.name, img.blob);
    });
  
    // Generate zip
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Download
    downloadBlob(content, 'kana-enhancer-batch.zip');
  };