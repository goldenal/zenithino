import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { SystemDependencyChecker } from './utils/system-check';
import { TempFileManager } from './utils/temp-file-manager';
import { PdfTextExtractor } from './pdf/pdf-text-extractor';
import { PdfRasterizer } from './pdf/pdf-rasterizer';
import { ImagePreprocessor } from './image/image-preprocessor';
import { TesseractJsOcrAdapter } from './adapters/tesseract-js-ocr.adapter';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '@nestjs/common';

// Mock external dependencies
jest.mock('./utils/system-check', () => ({
  SystemDependencyChecker: jest.fn().mockImplementation(() => ({
    checkDependencies: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('./utils/temp-file-manager');
jest.mock('./pdf/pdf-text-extractor');
jest.mock('./pdf/pdf-rasterizer');
jest.mock('./image/image-preprocessor');
jest.mock('./adapters/tesseract-js-ocr.adapter');

// Mock pdfjs-dist specifically for the workerSrc and getDocument
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '', // Mock this to avoid loading the actual worker
  },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: jest.fn((pageNumber) => Promise.resolve({
        getTextContent: jest.fn(() => Promise.resolve({
          items: [{ str: `Mocked digital text for page ${pageNumber}` }],
        })),
      })),
    }),
  })),
}));

describe('OcrService', () => {
  let service: OcrService;
  let systemChecker: SystemDependencyChecker;
  let tempFileManager: TempFileManager;
  let pdfTextExtractor: PdfTextExtractor;
  let pdfRasterizer: PdfRasterizer;
  let imagePreprocessor: ImagePreprocessor;
  let ocrAdapter: TesseractJsOcrAdapter;

  const mockPdfPath = '/tmp/test.pdf';
  const mockTempDir = '/tmp/ocr-job-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        SystemDependencyChecker,
        TempFileManager,
        PdfTextExtractor,
        PdfRasterizer,
        ImagePreprocessor,
        TesseractJsOcrAdapter,
        { provide: 'IOcrAdapter', useClass: TesseractJsOcrAdapter },
        Logger, // Provide a logger instance
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    systemChecker = module.get<SystemDependencyChecker>(SystemDependencyChecker);
    tempFileManager = module.get<TempFileManager>(TempFileManager);
    pdfTextExtractor = module.get<PdfTextExtractor>(PdfTextExtractor);
    pdfRasterizer = module.get<PdfRasterizer>(PdfRasterizer);
    imagePreprocessor = module.get<ImagePreprocessor>(ImagePreprocessor);
    ocrAdapter = module.get<TesseractJsOcrAdapter>('IOcrAdapter');

    // Mock implementations
    (systemChecker.checkDependencies as jest.Mock).mockResolvedValue(undefined);
    (tempFileManager.createJobTempDir as jest.Mock).mockReturnValue(mockTempDir);
    (tempFileManager.createTempFilePath as jest.Mock).mockImplementation((dir, prefix, ext) => path.join(dir, `${prefix}-${Date.now()}${ext}`));
    (tempFileManager.cleanupJobTempDir as jest.Mock).mockResolvedValue(undefined);
    (ocrAdapter.recognize as jest.Mock).mockResolvedValue({ text: 'OCR Text', confidence: 0.9 });
    (ocrAdapter.closeWorker as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Test Case 1: Digital PDF (2 pages) - no OCR needed ---
  it('should extract text from a digital PDF without OCR', async () => {
    (pdfTextExtractor.getNumPages as jest.Mock).mockResolvedValue(2);
    (pdfTextExtractor.extractPageText as jest.Mock)
      .mockResolvedValueOnce({ text: 'Digital Page 1 Content', isDigital: true })
      .mockResolvedValueOnce({ text: 'Digital Page 2 Content', isDigital: true });

    const result = await service.extractFromFile(mockPdfPath, {
      ocrFallback: 'when-empty',
      digitalTextThreshold: 10,
    });

    expect(result.numPages).toBe(2);
    expect(result.pages.length).toBe(2);
    expect(result.fullText).toContain('Digital Page 1 Content');
    expect(result.fullText).toContain('Digital Page 2 Content');
    expect(result.pages[0].isDigital).toBe(true);
    expect(result.pages[0].ocrUsed).toBe(false);
    expect(result.pages[1].isDigital).toBe(true);
    expect(result.pages[1].ocrUsed).toBe(false);
    expect(result.stats.pagesOcrd).toBe(0);
    expect(result.stats.digitalPages).toBe(2);
    expect(result.stats.scannedPages).toBe(0);
    expect(pdfRasterizer.rasterizePageToImage).not.toHaveBeenCalled();
    expect(imagePreprocessor.preprocessImage).not.toHaveBeenCalled();
    expect(ocrAdapter.recognize).not.toHaveBeenCalled();
    expect(tempFileManager.cleanupJobTempDir).toHaveBeenCalledWith(mockTempDir);
  });

  // --- Test Case 2: Scanned PDF (2 pages) - requires OCR ---
  it('should extract text from a scanned PDF using OCR', async () => {
    (pdfTextExtractor.getNumPages as jest.Mock).mockResolvedValue(2);
    (pdfTextExtractor.extractPageText as jest.Mock)
      .mockResolvedValueOnce({ text: '', isDigital: false }) // Scanned page 1
      .mockResolvedValueOnce({ text: 'Some digital text but below threshold', isDigital: false }); // Scanned page 2

    (pdfRasterizer.rasterizePageToImage as jest.Mock).mockResolvedValue('/tmp/rasterized.png');
    (imagePreprocessor.preprocessImage as jest.Mock).mockResolvedValue('/tmp/preprocessed.png');
    (ocrAdapter.recognize as jest.Mock)
      .mockResolvedValueOnce({ text: 'OCR Scanned Page 1', confidence: 0.85 })
      .mockResolvedValueOnce({ text: 'OCR Scanned Page 2', confidence: 0.92 });

    const result = await service.extractFromFile(mockPdfPath, {
      ocrFallback: 'when-empty', // Default behavior
      digitalTextThreshold: 50, // Ensure digital text is below threshold
    });

    expect(result.numPages).toBe(2);
    expect(result.pages.length).toBe(2);
    expect(result.fullText).toContain('OCR Scanned Page 1');
    expect(result.fullText).toContain('OCR Scanned Page 2');
    expect(result.pages[0].isDigital).toBe(false);
    expect(result.pages[0].ocrUsed).toBe(true);
    expect(result.pages[0].ocrConfidence).toBe(0.85);
    expect(result.pages[1].isDigital).toBe(false);
    expect(result.pages[1].ocrUsed).toBe(true);
    expect(result.pages[1].ocrConfidence).toBe(0.92);
    expect(result.stats.pagesOcrd).toBe(2);
    expect(result.stats.digitalPages).toBe(0);
    expect(result.stats.scannedPages).toBe(2);
    expect(pdfRasterizer.rasterizePageToImage).toHaveBeenCalledTimes(2);
    expect(imagePreprocessor.preprocessImage).toHaveBeenCalledTimes(2);
    expect(ocrAdapter.recognize).toHaveBeenCalledTimes(2);
    expect(tempFileManager.cleanupJobTempDir).toHaveBeenCalledWith(mockTempDir);
  });

  // --- Simple Benchmark Snippet (conceptual, not a true performance test) ---
  it('should handle a large PDF efficiently (conceptual benchmark)', async () => {
    const numPages = 100;
    const concurrency = 4;

    (pdfTextExtractor.getNumPages as jest.Mock).mockResolvedValue(numPages);
    (pdfTextExtractor.extractPageText as jest.Mock).mockImplementation(async (pdfPath, pageNum) => {
      // Simulate mixed content: some digital, some scanned
      if (pageNum % 3 === 0) {
        return { text: `Digital Content Page ${pageNum}`, isDigital: true };
      } else {
        return { text: '', isDigital: false }; // Requires OCR
      }
    });

    (pdfRasterizer.rasterizePageToImage as jest.Mock).mockResolvedValue('/tmp/rasterized.png');
    (imagePreprocessor.preprocessImage as jest.Mock).mockResolvedValue('/tmp/preprocessed.png');
    (ocrAdapter.recognize as jest.Mock).mockImplementation(async (imagePath, langs, config, logger) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // Simulate OCR delay
      return { text: `OCR Content for ${imagePath}`, confidence: 0.88 };
    });

    const options = {
      concurrency: concurrency,
      ocrFallback: 'when-empty',
      digitalTextThreshold: 10,
      debug: false,
      progressCallback: jest.fn(),
    };

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = process.hrtime.bigint();

    const result = await service.extractFromFile(mockPdfPath, options);

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;

    const timeMs = Number(endTime - startTime) / 1_000_000;
    const memoryUsedMb = (endMemory - startMemory) / (1024 * 1024);

    console.log(`--- Benchmark Results (Conceptual) ---`);
    console.log(`Total Pages: ${result.numPages}`);
    console.log(`Pages OCR'd: ${result.stats.pagesOcrd}`);
    console.log(`Concurrency: ${result.stats.concurrency}`);
    console.log(`Time taken: ${timeMs.toFixed(2)} ms`);
    console.log(`Memory used (heap): ${memoryUsedMb.toFixed(2)} MB`);
    console.log(`------------------------------------`);

    expect(result.numPages).toBe(numPages);
    expect(result.pages.length).toBe(numPages);
    expect(result.stats.concurrency).toBe(concurrency);
    expect(result.stats.pagesOcrd).toBeGreaterThan(0); // Should OCR some pages
    expect(options.progressCallback).toHaveBeenCalled();
    expect(tempFileManager.cleanupJobTempDir).toHaveBeenCalledWith(mockTempDir);
    expect(ocrAdapter.closeWorker).toHaveBeenCalled();
  }, 60000); // Increase timeout for benchmark test
});
