import { Injectable, Logger } from '@nestjs/common';
import pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js worker (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');
}

@Injectable()
export class PdfTextExtractor {
  private readonly logger = new Logger(PdfTextExtractor.name);

  /**
   * Extracts digital text content from a specific page of a PDF.
   * @param pdfPath The path to the PDF file.
   * @param pageNumber The 1-based page number to extract text from.
   * @returns The extracted text content and a flag indicating if it's likely digital.
   */
  async extractPageText(
    pdfPath: string,
    pageNumber: number,
    digitalTextThreshold: number,
  ): Promise<{ text: string; isDigital: boolean }> {
    this.logger.debug(`Extracting digital text from ${pdfPath}, page ${pageNumber}`);
    let pdfDocument;
    try {
      pdfDocument = await pdfjs.getDocument(pdfPath).promise;
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();

      let extractedText = '';
      let charCount = 0;
      let tokenCount = 0;
      let totalTokenLength = 0;

      for (const item of textContent.items) {
        if ('str' in item) {
          extractedText += item.str + ' ';
          charCount += item.str.length;
          tokenCount++;
          totalTokenLength += item.str.length;
        }
      }

      // Clean up extra spaces
      extractedText = extractedText.replace(/\s+/g, ' ').trim();

      // Heuristics to determine if the page is primarily digital
      // 1. Character count above a threshold
      // 2. Sufficient number of text items (not just a few stray words)
      // 3. Average token length is reasonable (not extremely short, which might indicate noise)
      const isDigital =
        charCount >= digitalTextThreshold ||
        (textContent.items.length > 4 && (totalTokenLength / tokenCount || 0) > 3);

      this.logger.debug(
        `Page ${pageNumber}: Digital text charCount=${charCount}, isDigital=${isDigital}`,
      );

      return { text: extractedText, isDigital };
    } catch (error) {
      this.logger.error(
        `Error extracting digital text from ${pdfPath}, page ${pageNumber}: ${error.message}`,
      );
      throw error;
    } finally {
      if (pdfDocument) {
        // pdfDocument.destroy(); // pdfjs-dist v2.x does not have destroy, v3.x+ does.
        // For broader compatibility, we might rely on garbage collection or manage worker lifecycle.
      }
    }
  }

  /**
   * Gets the total number of pages in a PDF document.
   * @param pdfPath The path to the PDF file.
   * @returns The total number of pages.
   */
  async getNumPages(pdfPath: string): Promise<number> {
    this.logger.debug(`Getting number of pages for ${pdfPath}`);
    let pdfDocument;
    try {
      pdfDocument = await pdfjs.getDocument(pdfPath).promise;
      const numPages = pdfDocument.numPages;
      this.logger.debug(`${pdfPath} has ${numPages} pages.`);
      return numPages;
    } catch (error) {
      this.logger.error(`Error getting number of pages for ${pdfPath}: ${error.message}`);
      throw error;
    } finally {
      if (pdfDocument) {
        // pdfDocument.destroy();
      }
    }
  }
}
