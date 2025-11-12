import { Injectable, Logger } from '@nestjs/common';
import { IOcrAdapter } from './ocr-adapter.interface';
import { recognize, setLogging } from 'tesseract.js';

@Injectable()
export class TesseractJsOcrAdapter implements IOcrAdapter {
  private readonly logger = new Logger(TesseractJsOcrAdapter.name);

  constructor() {
    // Configure tesseract.js logging to use NestJS logger
    setLogging(true); // Enable tesseract.js internal logging
  }

  async recognize(
    imagePath: string,
    languages: string[],
    config?: any,
    logger?: Logger,
  ): Promise<{ text: string; confidence: number | null }> {
    const currentLogger = logger || this.logger;
    currentLogger.debug(`Starting Tesseract.js OCR for ${imagePath} with languages: ${languages.join('+')}`);

    try {
      const { data: { text, confidence } } = await recognize(imagePath, languages.join('+'), {
        logger: (m) => currentLogger.debug(`Tesseract.js: ${m.status} - ${m.progress ? (m.progress * 100).toFixed(2) + '%' : ''}`),
        ...config,
      });
      currentLogger.debug(`Tesseract.js OCR completed for ${imagePath}. Confidence: ${confidence}`);
      return { text, confidence };
    } catch (error) {
      currentLogger.error(`Error during Tesseract.js OCR for ${imagePath}: ${error.message}`);
      throw error;
    }
  }

  // No worker to close when using Tesseract.recognize directly
  async closeWorker(): Promise<void> {
    this.logger.debug('No Tesseract.js worker to terminate (using direct recognize).');
  }
}
