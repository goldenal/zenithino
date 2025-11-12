import { Logger } from '@nestjs/common';
import { Multer } from 'multer';

// --- Input Options ---
export interface ExtractOptions {
  languages?: string[]; // default ['eng']
  concurrency?: number; // default 4
  dpi?: number; // default 300
  digitalTextThreshold?: number; // min characters to consider a page digital, default 20
  ocrFallback?: 'when-empty' | 'always' | 'prefer-longer'; // default 'when-empty'
  preprocess?: {
    enlargeFactor?: number; // e.g., 2 for 2x enlargement before OCR
    deskew?: boolean;
    binarize?: boolean; // Otsu binarization
  };
  timeoutMs?: number; // per page OCR timeout, default 120_000
  progressCallback?: (progress: { page: number; step: string; percent: number }) => void;
  debug?: boolean; // Keep temp files, increase logging
  tesseractConfig?: any; // Raw Tesseract config options
}

// --- Output Results ---
export interface PageResult {
  pageNumber: number;
  isDigital: boolean;
  ocrUsed: boolean;
  text: string;
  charCount: number;
  ocrConfidence?: number | null; // 0-100
  confidence?: 'high' | 'low' | 'ocr'; // Heuristic confidence
}

export interface ExtractError {
  page?: number;
  message: string;
  stack?: string;
}

export interface ExtractResult {
  numPages: number;
  pages: PageResult[];
  fullText: string;
  errors: ExtractError[];
  stats: {
    timeMs: number;
    pagesOcrd: number;
    concurrency: number;
    digitalPages: number;
    scannedPages: number;
  };
}

// --- OCR Adapter Interface ---
export interface IOcrAdapter {
  recognize(imagePath: string, languages: string[], config?: any, logger?: Logger): Promise<{ text: string; confidence: number | null }>;
}

// --- Internal Types ---
export interface PageProcessingJob {
  pageNumber: number;
  pdfPath: string;
  options: ExtractOptions;
  logger: Logger;
  tempDir: string;
}

export interface OcrServiceConfig {
  tempDir: string;
  popplerPath?: string; // Path to poppler-utils binaries
  tesseractPath?: string; // Path to tesseract executable
  imagemagickPath?: string; // Path to imagemagick convert executable
}

// --- Multer File (for compatibility with existing service) ---
// This is a minimal definition to avoid direct Multer dependency in core logic
export interface CustomMulterFile extends Multer.File {
  path: string; // Cloudinary URL or local path
}
