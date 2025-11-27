
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

const SYSTEM_PROMPT = `
Transform this product photo into a high-quality, studio-style image. 
Use soft, balanced lighting, remove any background distractions, apply subtle color correction, and give it a clean, modern look suitable for an e-commerce catalog. 
Keep the product's shape, texture, and colors true to life.
`;

export const generateProductImage = async (
  base64Image: string,
  mimeType: string,
  ratio: AspectRatio
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-3-pro-image-preview (Nano Banana Pro) for high quality results
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: SYSTEM_PROMPT
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: ratio,
          imageSize: '2K' // Requesting high quality
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data received from Gemini.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};
