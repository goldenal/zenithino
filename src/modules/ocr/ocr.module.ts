import { Module, Global } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { SystemDependencyChecker } from './utils/system-check';
import { TempFileManager } from './utils/temp-file-manager';
import { PdfTextExtractor } from './pdf/pdf-text-extractor';
import { PdfRasterizer } from './pdf/pdf-rasterizer';
import { ImagePreprocessor } from './image/image-preprocessor';
import { TesseractJsOcrAdapter } from './adapters/tesseract-js-ocr.adapter';

@Global() // Make OcrModule available globally
@Module({
  providers: [
    OcrService,
    SystemDependencyChecker,
    TempFileManager,
    PdfTextExtractor,
    PdfRasterizer,
    ImagePreprocessor,
    TesseractJsOcrAdapter,
    { provide: 'IOcrAdapter', useClass: TesseractJsOcrAdapter }, // Provide the OCR adapter
  ],
  exports: [OcrService, 'IOcrAdapter'],
})
export class OcrModule {}