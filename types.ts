export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  generatedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  promptModifier?: string;
}
