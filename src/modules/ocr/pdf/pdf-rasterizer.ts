import { Injectable, Logger } from '@nestjs/common';
import * as Poppler from 'pdf-poppler';
import * as path from 'path';
import * as fs from 'fs-extra';

@Injectable()
export class PdfRasterizer {
  private readonly logger = new Logger(PdfRasterizer.name);

  /**
   * Rasterizes a specific page of a PDF to an image file.
   * @param pdfPath The path to the PDF file.
   * @param pageNumber The 1-based page number to rasterize.
   * @param outputPath The directory where the image should be saved.
   * @param dpi The DPI for rasterization.
   * @returns The full path to the generated image file.
   */
  async rasterizePageToImage(
    pdfPath: string,
    pageNumber: number,
    outputPath: string,
    dpi: number,
  ): Promise<string> {
    this.logger.debug(`Rasterizing ${pdfPath} page ${pageNumber} to image at ${dpi} DPI`);

    // Ensure output directory exists
    await fs.ensureDir(outputPath);

    const outputFilename = `page-${pageNumber}`;
    const poppler = new Poppler.Poppler(pdfPath);

    const options: Poppler.Options = {
      firstPage: pageNumber,
      lastPage: pageNumber,
      pngFile: true, // Output as PNG
      outdir: outputPath,
      outfile: outputFilename,
      dpi: dpi,
    };

    try {
      // pdf-poppler returns an array of output paths, even for single page
      const result = await poppler.pdfToCairo(options);
      const imagePath = path.join(outputPath, `${outputFilename}.png`);

      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Rasterization failed: Image file not found at ${imagePath}`);
      }

      this.logger.debug(`Successfully rasterized page ${pageNumber} to ${imagePath}`);
      return imagePath;
    } catch (error) {
      this.logger.error(
        `Error rasterizing ${pdfPath} page ${pageNumber}: ${error.message}`,
      );
      throw error;
    }
  }
}
