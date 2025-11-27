
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, BackgroundOption } from "../types";

const BASE_PROMPT = `
Transform this product photo into a high-quality, studio-style image. 
Use soft, balanced lighting, remove any background distractions, apply subtle color correction, and give it a clean, modern look suitable for an e-commerce catalog. 
Keep the product's shape, texture, and colors true to life.
`;

const getBackgroundInstruction = (option: BackgroundOption, customColor?: string): string => {
  switch (option) {
    case 'white':
      return "Ensure the background is pure, solid white (#FFFFFF).";
    case 'black':
      return "Ensure the background is pure, solid black (#000000).";
    case 'gray':
      return "Ensure the background is a neutral, solid gray.";
    case 'green':
      return "Ensure the background is a solid bright green (#00FF00) suitable for chroma keying.";
    case 'transparent':
      return "Ensure the background is transparent (remove background).";
    case 'custom':
      return `Ensure the background is a solid color with hex code ${customColor || '#FFFFFF'}.`;
    default:
      return "Ensure the background is pure, solid white.";
  }
};

export const generateProductImage = async (
  base64Image: string,
  mimeType: string,
  ratio: AspectRatio,
  bgOption: BackgroundOption = 'white',
  customColor?: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const backgroundPrompt = getBackgroundInstruction(bgOption, customColor);
    const fullPrompt = `${BASE_PROMPT}\n${backgroundPrompt}`;

    // Using gemini-3-pro-image-preview (Nano Banana Pro) for high quality results
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: fullPrompt
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