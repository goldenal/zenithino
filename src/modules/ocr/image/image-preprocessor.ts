import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs-extra';

@Injectable()
export class ImagePreprocessor {
  private readonly logger = new Logger(ImagePreprocessor.name);

  /**
   * Applies various preprocessing steps to an image to optimize it for OCR.
   * @param inputImagePath The path to the input image file.
   * @param outputImagePath The path where the processed image should be saved.
   * @param options Preprocessing options.
   * @returns The path to the processed image file.
   */
  async preprocessImage(
    inputImagePath: string,
    outputImagePath: string,
    options?: { enlargeFactor?: number; deskew?: boolean; binarize?: boolean; dpi?: number },
  ): Promise<string> {
    this.logger.debug(`Preprocessing image: ${inputImagePath}`);
    let image = sharp(inputImagePath);

    const metadata = await image.metadata();
    const currentDpi = metadata.density || 72; // Default to 72 if not found

    // 1. Ensure minimum DPI resolution (if original is lower than target DPI)
    // If the image was rasterized at a certain DPI, sharp might not need to resample
    // unless we want to enlarge it further.
    if (options?.dpi && currentDpi < options.dpi) {
      this.logger.debug(`Resampling image from ${currentDpi} to ${options.dpi} DPI.`);
      image = image.resize({
        width: Math.round((metadata.width / currentDpi) * options.dpi),
        height: Math.round((metadata.height / currentDpi) * options.dpi),
        kernel: sharp.kernel.lanczos3, // High-quality resampling
      });
    }

    // 2. Enlarge factor (e.g., for very small text)
    if (options?.enlargeFactor && options.enlargeFactor > 1) {
      this.logger.debug(`Enlarging image by factor: ${options.enlargeFactor}`);
      image = image.resize({
        width: Math.round((metadata.width || 0) * options.enlargeFactor),
        height: Math.round((metadata.height || 0) * options.enlargeFactor),
        kernel: sharp.kernel.lanczos3,
      });
    }

    // 3. Convert to greyscale
    image = image.grayscale();

    // 4. Apply contrast (optional, often helps)
    // A simple contrast enhancement can be done by normalizing
    image = image.normalize();

    // 5. Binarization (Otsu's method is common for OCR)
    if (options?.binarize) {
      this.logger.debug('Applying binarization (Otsu method).');
      // Sharp's threshold method can perform Otsu binarization if no threshold is provided
      image = image.threshold();
    }

    // 6. Deskew (Sharp doesn't have native deskew. This would typically require an external library or custom implementation)
    // For now, we'll log a warning if requested.
    if (options?.deskew) {
      this.logger.warn('Deskewing is requested but not natively supported by Sharp. Skipping deskew.');
      // A more advanced implementation would integrate with an external tool or library here.
    }

    // Save as high-quality PNG
    await image.png({ quality: 90 }).toFile(outputImagePath);
    this.logger.debug(`Processed image saved to: ${outputImagePath}`);
    return outputImagePath;
  }
}
