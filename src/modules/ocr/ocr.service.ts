/**
 * README-style comments for OcrService
 *
 * This OcrService is designed for robust, local PDF text extraction and OCR.
 * It aims for accuracy, efficiency, and resilience, especially with large, mixed-content PDFs.
 *
 * Trade-offs:
 * - Speed vs. Accuracy: Prioritizes accuracy by using high DPI rasterization and image preprocessing
 *   before OCR. This can be slower than direct OCR on lower quality images but yields better results.
 * - Resource Usage: Designed for concurrency control (`p-limit`) to manage CPU/memory, but high DPI
 *   rasterization and image processing are inherently resource-intensive. Running many concurrent
 *   OCR jobs on a single machine requires significant RAM and CPU.
 * - System Dependencies: Relies on external tools (Poppler, Tesseract, ImageMagick) for core
 *   functionality. This adds setup complexity but leverages highly optimized native libraries.
 *
 * Key Features:
 * - **Hybrid Extraction:** Detects digital text layers first (`pdfjs-dist`). Only resorts to OCR
 *   (`tesseract.js` or `node-tesseract-ocr`) for scanned pages or as a configurable fallback.
 * - **Concurrency Control:** Uses `p-limit` to process multiple pages in parallel, configurable
 *   via `concurrency` option.
 * - **Image Preprocessing:** Leverages `sharp` for DPI scaling, greyscale conversion, normalization,
 *   and optional binarization to enhance OCR accuracy.
 * - **Robustness:** Includes retry mechanisms, timeouts for OCR jobs, and graceful error handling
 *   per page, allowing the process to continue even if some pages fail.
 * - **Temporary File Management:** Manages temporary directories and files, ensuring cleanup
 *   on success, error, or process exit.
 * - **Pluggable OCR Adapter:** Designed with an `IOcrAdapter` interface, allowing easy swapping
 *   between `tesseract.js` (pure JS) and potentially `node-tesseract-ocr` (native wrapper)
 *   or other OCR engines.
 * - **Progress Reporting:** Provides a callback for real-time progress updates.
 * - **Structured Output:** Returns detailed per-page metadata, merged full text, and error logs.
 *
 * Dockerfile Notes for System Dependencies:
 * To run this service in a Docker container, you'll need to install the following system packages:
 *
 * ```dockerfile
 * # Install Poppler utilities (for pdftoppm)
 * RUN apt-get update && apt-get install -y \
 *     poppler-utils \
 *     # Install Tesseract OCR and language packs
 *     tesseract-ocr \
 *     tesseract-ocr-eng \
 *     # Add other language packs as needed, e.g., tesseract-ocr-spa
 *     # Install ImageMagick (for 'convert' and 'identify' if sharp needs it, or for deskewing)
 *     imagemagick \
 *     # Dependencies for sharp (if not already present in base image)
 *     libvips-dev \
 *     # Clean up apt cache
 *     && rm -rf /var/lib/apt/lists/*
 * ```
 *
 * Ensure `tessdata` is available for Tesseract.js if using it, or for native Tesseract.
 * For `tesseract.js`, language data is downloaded automatically, but for native `tesseract-ocr`,
 * you need to install `tesseract-ocr-LANG` packages.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import * as path from 'path';
import * as pLimit from 'p-limit';
import {
  ExtractOptions,
  ExtractResult,
  PageResult,
  ExtractError,
  type IOcrAdapter, // Changed to import type
  CustomMulterFile,
} from './interfaces/ocr.interfaces';
import { SystemDependencyChecker } from './utils/system-check';
import { TempFileManager } from './utils/temp-file-manager';
import { PdfTextExtractor } from './pdf/pdf-text-extractor';
import { PdfRasterizer } from './pdf/pdf-rasterizer';
import { ImagePreprocessor } from './image/image-preprocessor';
import { DocumentType } from '../../common/enums/document-type.enum'; // Keep for compatibility with existing service
import { ExtractedData } from './interfaces/extracted-data.interface'; // Keep for compatibility with existing service

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly DEFAULT_CONCURRENCY = 4;
  private readonly DEFAULT_DPI = 300;
  private readonly DEFAULT_DIGITAL_TEXT_THRESHOLD = 20;
  private readonly DEFAULT_OCR_TIMEOUT_MS = 120_000; // 2 minutes

  constructor(
    private readonly systemChecker: SystemDependencyChecker,
    private readonly tempFileManager: TempFileManager,
    private readonly pdfTextExtractor: PdfTextExtractor,
    private readonly pdfRasterizer: PdfRasterizer,
    private readonly imagePreprocessor: ImagePreprocessor,
    @Inject('IOcrAdapter') private readonly ocrAdapter: IOcrAdapter,
  ) {
    // Check system dependencies on service initialization
    this.systemChecker.checkDependencies().catch((err) => {
      this.logger.error(`Failed to verify system dependencies: ${err.message}`);
      // Depending on application requirements, you might want to exit or disable OCR functionality
      // For now, we'll let it throw, which will prevent the app from starting if critical deps are missing.
      throw err;
    });
  }

  /**
   * Public method to extract text from a PDF file.
   * @param filePath The path to the PDF file.
   * @param options Configuration options for extraction.
   * @returns A promise that resolves to an ExtractResult object.
   */
  async extractFromFile(filePath: string, options?: ExtractOptions): Promise<ExtractResult> {
    const startTime = process.hrtime.bigint();
    const jobTempDir = this.tempFileManager.createJobTempDir();
    let pdfDocument = null; // To hold PDF.js document instance if needed for cleanup

    const effectiveOptions: Required<ExtractOptions> = {
      languages: options?.languages || ['eng'],
      concurrency: options?.concurrency || this.DEFAULT_CONCURRENCY,
      dpi: options?.dpi || this.DEFAULT_DPI,
      digitalTextThreshold: options?.digitalTextThreshold || this.DEFAULT_DIGITAL_TEXT_THRESHOLD,
      ocrFallback: options?.ocrFallback || 'when-empty',
      preprocess: options?.preprocess || {},
      timeoutMs: options?.timeoutMs || this.DEFAULT_OCR_TIMEOUT_MS,
      progressCallback: options?.progressCallback || (() => {}),
      debug: options?.debug || false,
      tesseractConfig: options?.tesseractConfig || {},
    };

    const results: PageResult[] = [];
    const errors: ExtractError[] = [];
    let pagesOcrd = 0;
    let digitalPages = 0;
    let scannedPages = 0;

    try {
      this.logger.log(`Starting PDF extraction for ${filePath} with options: ${JSON.stringify(effectiveOptions)}`);
      effectiveOptions.progressCallback({ page: 0, step: 'Initializing', percent: 0 });

      const numPages = await this.pdfTextExtractor.getNumPages(filePath);
      effectiveOptions.progressCallback({ page: 0, step: 'PDF Loaded', percent: 5 });

      const limit = pLimit.default(effectiveOptions.concurrency);
      const pagePromises: Promise<void>[] = [];

      for (let i = 1; i <= numPages; i++) {
        const pageNumber = i;
        pagePromises.push(
          limit(async () => {
            effectiveOptions.progressCallback({ page: pageNumber, step: 'Processing', percent: (pageNumber / numPages) * 100 * 0.1 }); // Initial progress

            try {
              const { text: digitalText, isDigital } = await this.pdfTextExtractor.extractPageText(
                filePath,
                pageNumber,
                effectiveOptions.digitalTextThreshold,
              );

              let pageText = digitalText;
              let ocrUsed = false;
              let ocrConfidence: number | null = null;
              let confidence: PageResult['confidence'] = isDigital ? 'high' : 'low';

              // Determine if OCR is needed
              const needsOcr =
                (!isDigital && effectiveOptions.ocrFallback !== 'always') ||
                (isDigital && digitalText.length < effectiveOptions.digitalTextThreshold && effectiveOptions.ocrFallback !== 'when-empty') ||
                effectiveOptions.ocrFallback === 'always' ||
                effectiveOptions.ocrFallback === 'prefer-longer';

              if (needsOcr) {
                pagesOcrd++;
                scannedPages++;
                effectiveOptions.progressCallback({ page: pageNumber, step: 'Rasterizing for OCR', percent: (pageNumber / numPages) * 100 * 0.2 });

                const imageTempPath = this.tempFileManager.createTempFilePath(jobTempDir, `page-${pageNumber}`, '.png');
                const processedImageTempPath = this.tempFileManager.createTempFilePath(jobTempDir, `page-${pageNumber}-processed`, '.png');

                try {
                  const rasterizedImagePath = await this.pdfRasterizer.rasterizePageToImage(
                    filePath,
                    pageNumber,
                    jobTempDir,
                    effectiveOptions.dpi,
                  );
                  effectiveOptions.progressCallback({ page: pageNumber, step: 'Preprocessing Image', percent: (pageNumber / numPages) * 100 * 0.4 });

                  const preprocessedImagePath = await this.imagePreprocessor.preprocessImage(
                    rasterizedImagePath,
                    processedImageTempPath,
                    {
                      ...effectiveOptions.preprocess,
                      dpi: effectiveOptions.dpi,
                    },
                  );
                  effectiveOptions.progressCallback({ page: pageNumber, step: 'Running OCR', percent: (pageNumber / numPages) * 100 * 0.6 });

                  const { text: ocrText, confidence: ocrConf } = await this.runOcrWithRetries(
                    preprocessedImagePath,
                    effectiveOptions.languages,
                    effectiveOptions.tesseractConfig,
                    effectiveOptions.timeoutMs,
                    this.logger,
                  );

                  ocrUsed = true;
                  ocrConfidence = ocrConf;
                  confidence = 'ocr';

                  if (effectiveOptions.ocrFallback === 'prefer-longer') {
                    // Choose the longer, cleaner text
                    pageText = this.getCleanerText(digitalText, ocrText);
                    if (pageText === ocrText) {
                      confidence = 'ocr';
                    } else {
                      confidence = 'high'; // Digital text was preferred
                    }
                  } else {
                    pageText = ocrText;
                  }
                } finally {
                  // Clean up temporary image files unless debug is true
                  if (!effectiveOptions.debug) {
                    await this.tempFileManager.cleanupJobTempDir(path.dirname(imageTempPath)); // Clean up the directory where images were saved
                  }
                }
              } else {
                digitalPages++;
              }

              results.push({
                pageNumber,
                isDigital,
                ocrUsed,
                text: pageText,
                charCount: pageText.length,
                ocrConfidence,
                confidence,
              });
              effectiveOptions.progressCallback({ page: pageNumber, step: 'Completed', percent: (pageNumber / numPages) * 100 });
            } catch (pageError) {
              this.logger.error(`Error processing page ${pageNumber}: ${pageError.message}`);
              errors.push({ page: pageNumber, message: pageError.message, stack: pageError.stack });
              results.push({
                pageNumber,
                isDigital: false,
                ocrUsed: false,
                text: '',
                charCount: 0,
                ocrConfidence: null,
                confidence: 'low', // Indicate failure or no reliable text
              });
            }
          }),
        );
      }

      await Promise.all(pagePromises);

      // Sort results by page number
      results.sort((a, b) => a.pageNumber - b.pageNumber);

      const fullText = results.map((p) => p.text).join('\n\n');

      const endTime = process.hrtime.bigint();
      const timeMs = Number(endTime - startTime) / 1_000_000;

      effectiveOptions.progressCallback({ page: numPages, step: 'Finished', percent: 100 });

      return {
        numPages,
        pages: results,
        fullText,
        errors,
        stats: {
          timeMs,
          pagesOcrd,
          concurrency: effectiveOptions.concurrency,
          digitalPages,
          scannedPages,
        },
      };
    } catch (error) {
      this.logger.error(`Fatal error during PDF extraction for ${filePath}: ${error.message}`, error.stack);
      errors.push({ message: `Fatal error: ${error.message}`, stack: error.stack });
      throw error;
    } finally {
      // Ensure all temporary files are cleaned up
      if (!effectiveOptions.debug) {
        await this.tempFileManager.cleanupJobTempDir(jobTempDir);
      }
      // Terminate Tesseract.js worker if it was initialized
      if (typeof (this.ocrAdapter as any).closeWorker === 'function') {
        await (this.ocrAdapter as any).closeWorker();
      }
    }
  }

  /**
   * Helper to run OCR with retries and timeout.
   */
  private async runOcrWithRetries(
    imagePath: string,
    languages: string[],
    tesseractConfig: any,
    timeoutMs: number,
    logger: Logger,
    retries: number = 2,
  ): Promise<{ text: string; confidence: number | null }> {
    for (let i = 0; i <= retries; i++) {
      try {
        const ocrPromise = this.ocrAdapter.recognize(imagePath, languages, tesseractConfig, logger);
        const timeoutPromise = new Promise<{ text: string; confidence: number | null }>((_, reject) =>
          setTimeout(() => reject(new Error(`OCR timed out after ${timeoutMs}ms`)), timeoutMs),
        );
        return await Promise.race([ocrPromise, timeoutPromise]);
      } catch (error) {
        logger.warn(`OCR attempt ${i + 1}/${retries + 1} failed for ${imagePath}: ${error.message}`);
        if (i === retries) {
          throw error; // Re-throw if all retries failed
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw new Error('Should not reach here'); // Should be caught by the loop
  }

  /**
   * Compares two text strings and returns the "cleaner" or "longer" one.
   * Simple heuristic: prefer digital if available and reasonable length, otherwise OCR.
   * If prefer-longer, choose the one with more non-whitespace characters.
   */
  private getCleanerText(digitalText: string, ocrText: string): string {
    const cleanDigital = digitalText.replace(/\s+/g, ' ').trim();
    const cleanOcr = ocrText.replace(/\s+/g, ' ').trim();

    if (cleanDigital.length > cleanOcr.length * 0.8 && cleanDigital.length > this.DEFAULT_DIGITAL_TEXT_THRESHOLD) {
      return cleanDigital; // Prefer digital if it's reasonably long and not too much shorter than OCR
    }
    return cleanOcr; // Otherwise, prefer OCR
  }

  // --- Compatibility with existing service's extractText method ---
  // This method is kept to maintain compatibility with the existing DocumentsService.
  // It will now call the new extractFromFile method internally.
  async extractText(
    file: CustomMulterFile, // Use CustomMulterFile for Cloudinary compatibility
    documentType: DocumentType,
  ): Promise<ExtractedData> {
    this.logger.log(`Compatibility mode: Extracting text for documentType: ${documentType} from file: ${file.path}`);

    // For now, we'll just extract the full text.
    // The structuredData part will need to be re-implemented based on the full text.
    const result = await this.extractFromFile(file.path, {
      languages: ['eng'], // Default to English for compatibility
      // Add other options as needed, e.g., based on documentType
    });

    // This part needs to be re-thought. The original service returned mock structured data.
    // Now, we have raw text. Converting raw text to structured data (SalesReceiptData, etc.)
    // is a complex task that typically involves NLP or regex specific to document types.
    // For this rewrite, we'll return the full text and a placeholder for structured data.
    // A future enhancement would be to implement actual structured data extraction from the fullText.
    return {
      documentType: documentType,
      extractedText: result.fullText,
      structuredData: {
        // Placeholder: Actual structured data extraction logic would go here
        // e.g., parse result.fullText based on documentType
        rawPages: result.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })),
      } as any, // Cast to any for now, as it's a placeholder
    };
  }
}
