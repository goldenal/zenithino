import { Injectable, Logger } from '@nestjs/common';
import { Multer } from 'multer';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { v2 as cloudinary } from 'cloudinary';
import {
  ExtractedData,
  SalesReceiptData,
  SalesRecordData,
  BankStatementData,
} from './interfaces/extracted-data.interface';
import { DocumentType } from '../../common/enums/document-type.enum';

interface PageTextResult {
  text: string;
  isDigital: boolean;
  pageNumber: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly tempDir: string;
  private readonly DIGITAL_TEXT_THRESHOLD = 50; // Minimum characters to consider as digital text
  private readonly OCR_CONCURRENCY = 2; // Limit concurrent OCR operations
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly OCR_TIMEOUT = 120000; // 2 minutes per page
  private readonly SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/jpg'];
  private readonly SUPPORTED_PDF_FORMAT = 'application/pdf';

  constructor() {
    // Create a temporary directory for processing files
    this.tempDir = path.join(os.tmpdir(), 'zenithino-ocr');
    fs.ensureDirSync(this.tempDir);
    
    // Configure Cloudinary for downloading files
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true, // Use HTTPS
    });
    
    // Cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Main method to extract text from files
   * Supports both PDFs and images
   */
  async extractText(
    file: Multer.File,
    documentType: DocumentType,
  ): Promise<ExtractedData> {
    const startTime = Date.now();
    let localFilePath: string | null = null;

    try {
      this.logger.log(
        `Starting text extraction for file: ${file.originalname}, type: ${documentType}`,
      );

      // Validate file
      this.validateFile(file);

      // Download file from Cloudinary or use buffer
      localFilePath = await this.downloadFile(file);

      // Determine file type
      const isPdf = file.mimetype === this.SUPPORTED_PDF_FORMAT || 
                    file.originalname.toLowerCase().endsWith('.pdf');
      const isImage = this.SUPPORTED_IMAGE_FORMATS.includes(file.mimetype);

      if (!isPdf && !isImage) {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }

      // Extract text
      let extractedText = '';
      if (isPdf) {
        extractedText = await this.extractTextFromPdf(localFilePath);
      } else {
        extractedText = await this.extractTextFromImage(localFilePath);
      }

      // Parse structured data based on document type
      const structuredData = this.parseStructuredData(
        extractedText,
        documentType,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Text extraction completed in ${processingTime}ms. Extracted ${extractedText.length} characters.`,
      );

      return {
        documentType,
        extractedText,
        structuredData,
      };
    } catch (error) {
      this.logger.error(
        `Error extracting text from file ${file.originalname}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      // Cleanup temporary files
      if (localFilePath) {
        await this.cleanupFile(localFilePath);
      }
    }
  }

  /**
   * Validates the file before processing
   */
  private validateFile(file: Multer.File): void {
    if (!file) {
      throw new Error('File is required');
    }

    // Check file size if buffer is available
    if (file.buffer && file.buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Validate mime type
    const isValidType =
      file.mimetype === this.SUPPORTED_PDF_FORMAT ||
      this.SUPPORTED_IMAGE_FORMATS.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isValidType) {
      throw new Error(
        `Unsupported file type: ${file.mimetype}. Supported types: PDF, JPEG, PNG`,
      );
    }
  }

  /**
   * Downloads file from Cloudinary URL or uses buffer
   */
  private async downloadFile(file: Multer.File): Promise<string> {
    const fileExtension = path.extname(file.originalname) || 
                         (file.mimetype === this.SUPPORTED_PDF_FORMAT ? '.pdf' : '.jpg');
    const tempFilePath = path.join(
      this.tempDir,
      `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`,
    );

    try {
      // If buffer is available, use it directly
      if (file.buffer && file.buffer.length > 0) {
        await fs.writeFile(tempFilePath, file.buffer);
        this.logger.debug(`File saved from buffer to: ${tempFilePath}`);
        return tempFilePath;
      }

      // Otherwise, download from Cloudinary URL
      if (file.path) {
        this.logger.debug(`Downloading file from Cloudinary: ${file.path}`);
        
        try {
          const cloudinaryUrl = file.path;
          
          // Since files are uploaded with access_mode: 'public', 
          // they should be directly accessible via the URL
          // Try direct download first
          try {
            const response = await axios.get(cloudinaryUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: this.MAX_FILE_SIZE,
              headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*',
              },
              validateStatus: (status) => status === 200, // Only accept 200
            });
            
            await fs.writeFile(tempFilePath, Buffer.from(response.data));
            this.logger.debug(`File downloaded successfully to: ${tempFilePath}`);
            return tempFilePath;
          } catch (directError: any) {
            // If direct download fails (401, 403, etc.), try using Cloudinary SDK
            this.logger.warn(`Direct download failed: ${directError.message}. Trying Cloudinary SDK...`);
            
            // Extract public_id from URL
            const urlParts = cloudinaryUrl.split('/');
            const uploadIndex = urlParts.indexOf('upload');
            
            if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
              // Extract folder and public_id
              const resourceParts = urlParts.slice(uploadIndex + 2); // Skip 'upload' and version
              const publicIdWithExt = resourceParts.join('/');
              const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension
              
              this.logger.debug(`Extracted public_id: ${publicId}`);
              
              // Determine resource type
              const isPdf = file.mimetype?.includes('pdf') || file.originalname?.toLowerCase().endsWith('.pdf');
              const resourceType = isPdf ? 'raw' : 'image';
              
              // Use Cloudinary SDK to generate a public URL
              const publicUrl = cloudinary.url(publicId, {
                resource_type: resourceType,
                secure: true,
                type: 'upload',
              });
              
              this.logger.debug(`Generated Cloudinary public URL: ${publicUrl}`);
              
              // Download from the public URL
              const response = await axios.get(publicUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: this.MAX_FILE_SIZE,
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  'Accept': '*/*',
                },
              });
              
              await fs.writeFile(tempFilePath, Buffer.from(response.data));
              this.logger.debug(`File downloaded via Cloudinary SDK to: ${tempFilePath}`);
              return tempFilePath;
            } else {
              throw new Error(`Invalid Cloudinary URL format: ${cloudinaryUrl}`);
            }
          }
        } catch (downloadError: any) {
          this.logger.error(`Failed to download from Cloudinary: ${downloadError.message}`);
          throw new Error(`Failed to download file from Cloudinary: ${downloadError.message}. URL: ${file.path}`);
        }
      }

      throw new Error('No file buffer or path available');
    } catch (error) {
      // Cleanup on error
      await this.cleanupFile(tempFilePath);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Extracts text from PDF file
   * First tries to extract digital text, then falls back to OCR if needed
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    this.logger.debug(`Extracting text from PDF: ${filePath}`);

    try {
      // Read PDF file
      const pdfBuffer = await fs.readFile(filePath);
      
      // Try to extract digital text using pdf-parse
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      const digitalText = textResult.text.trim();
      const pageCount = textResult.total;
      
      this.logger.debug(
        `Digital text extraction: ${digitalText.length} characters, ${pageCount} pages`,
      );

      // Check if we have sufficient digital text
      if (digitalText.length >= this.DIGITAL_TEXT_THRESHOLD) {
        this.logger.log(
          `PDF contains digital text (${digitalText.length} chars). Using direct text extraction.`,
        );
        return digitalText;
      }

      // If digital text is insufficient, use OCR
      this.logger.log(
        `PDF appears to be scanned or has insufficient digital text. Using OCR for ${pageCount} pages.`,
      );

      // For scanned PDFs, convert pages to images and OCR them
      try {
        const ocrText = await this.extractTextFromPdfWithOcr(
          filePath,
          pageCount,
        );
        return ocrText.length > digitalText.length ? ocrText : digitalText;
      } catch (ocrError) {
        this.logger.warn(
          `OCR failed: ${ocrError.message}. Returning extracted digital text.`,
        );
        // Return whatever digital text we have
        if (digitalText.length > 0) {
          return digitalText;
        }
        throw new Error(
          `Failed to extract text from PDF: ${ocrError.message}`,
        );
      }
    } catch (error) {
      if (error.message.includes('OCR for PDFs')) {
        throw error;
      }
      this.logger.error(`Error extracting text from PDF: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extracts text from PDF using OCR by converting pages to images
   * This method is used when digital text extraction is insufficient
   * Note: This requires PDF to image conversion. For production, use pdf-poppler or similar.
   */
  private async extractTextFromPdfWithOcr(
    filePath: string,
    pageCount: number,
  ): Promise<string> {
    this.logger.debug(
      `Extracting text from PDF using OCR: ${filePath}, ${pageCount} pages`,
    );

    try {
      // Try to use pdf-parse's screenshot capability to convert PDF pages to images
      const pdfBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: pdfBuffer });
      
      // Get screenshots for all pages
      // Note: getScreenshot() returns all pages at once
      const screenshotResult = await parser.getScreenshot({
        scale: 2.0, // Higher scale for better OCR
        imageBuffer: true,
        imageDataUrl: false,
      });

      if (!screenshotResult || !screenshotResult.pages || screenshotResult.pages.length === 0) {
        throw new Error('Failed to generate screenshots from PDF');
      }

      // Use concurrency limit for OCR operations
      const limit = pLimit(this.OCR_CONCURRENCY);
      const pageTexts: string[] = [];

      // Process each page screenshot
      const pagePromises = screenshotResult.pages.map((screenshot, index) =>
        limit(async () => {
          try {
            if (screenshot && screenshot.data) {
              // Save screenshot to temporary file
              const imagePath = path.join(
                this.tempDir,
                `page-${screenshot.pageNumber}-${Date.now()}-${index}.png`,
              );
              await fs.writeFile(imagePath, Buffer.from(screenshot.data));

              // OCR the image
              const pageText = await this.extractTextFromImage(imagePath);
              pageTexts[screenshot.pageNumber - 1] = pageText;

              // Cleanup image
              await this.cleanupFile(imagePath);
            } else {
              this.logger.warn(
                `Failed to get screenshot for page ${screenshot.pageNumber}`,
              );
              pageTexts[screenshot.pageNumber - 1] = '';
            }
          } catch (error) {
            this.logger.warn(
              `Error processing page ${screenshot.pageNumber}: ${error.message}`,
            );
            pageTexts[screenshot.pageNumber - 1] = '';
          }
        }),
      );

      // Wait for all pages to be processed
      await Promise.all(pagePromises);

      // Combine all page texts
      const combinedText = pageTexts.filter(Boolean).join('\n\n');
      this.logger.log(
        `OCR completed for ${pageCount} pages. Extracted ${combinedText.length} characters.`,
      );

      return combinedText;
    } catch (error) {
      this.logger.error(
        `Error extracting text from PDF with OCR: ${error.message}`,
      );
      // Re-throw error so caller can handle it
      throw error;
    }
  }

  /**
   * Extracts text from image file using OCR
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    this.logger.debug(`Extracting text from image: ${filePath}`);

    let worker: any = null;
    let processedImagePath = filePath;

    try {
      // Preprocess image for better OCR results
      processedImagePath = await this.preprocessImage(filePath);

      // Create Tesseract worker
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Perform OCR with timeout
      const ocrPromise = worker.recognize(processedImagePath);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), this.OCR_TIMEOUT),
      );

      const { data } = await Promise.race([ocrPromise, timeoutPromise]) as any;
      const extractedText = data.text.trim();

      this.logger.log(
        `OCR completed. Extracted ${extractedText.length} characters with confidence: ${data.confidence}`,
      );

      return extractedText;
    } catch (error) {
      this.logger.error(`Error during OCR: ${error.message}`);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    } finally {
      // Cleanup worker
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          this.logger.warn(`Error terminating OCR worker: ${error.message}`);
        }
      }

      // Cleanup processed image if different from original
      if (processedImagePath !== filePath) {
        await this.cleanupFile(processedImagePath);
      }
    }
  }

  /**
   * Preprocesses image for better OCR results
   */
  private async preprocessImage(filePath: string): Promise<string> {
    try {
      const outputPath = path.join(
        this.tempDir,
        `processed-${Date.now()}-${Math.random().toString(36).substring(7)}.png`,
      );

      // Apply image preprocessing
      await sharp(filePath)
        .greyscale() // Convert to greyscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen image
        .png({ quality: 100 }) // Save as PNG
        .toFile(outputPath);

      this.logger.debug(`Image preprocessed and saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.warn(
        `Image preprocessing failed: ${error.message}. Using original image.`,
      );
      return filePath;
    }
  }

  /**
   * Parses extracted text into structured data based on document type
   * This is a simplified parser - in production, you'd use more sophisticated parsing
   */
  private parseStructuredData(
    extractedText: string,
    documentType: DocumentType,
  ): ExtractedData['structuredData'] {
    switch (documentType) {
      case DocumentType.SALES_RECEIPT:
        return { salesReceipts: this.parseSalesReceipts(extractedText) };
      case DocumentType.SALES_RECORD:
        return { salesRecords: this.parseSalesRecords(extractedText) };
      case DocumentType.BANK_STATEMENT:
        return { bankStatements: this.parseBankStatements(extractedText) };
      default:
        return {};
    }
  }

  /**
   * Parses sales receipts from extracted text
   */
  private parseSalesReceipts(text: string): SalesReceiptData[] {
    // This is a simplified parser
    // In production, you'd use NLP, regex patterns, or ML models for better parsing
    const receipts: SalesReceiptData[] = [];
    
    // Extract date patterns
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
    const amountPattern = /(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    
    const dates = text.match(datePattern) || [];
    const amounts = text.match(amountPattern) || [];

    // Create receipts from extracted data
    dates.forEach((date, index) => {
      const amount = amounts[index]
        ? parseFloat(amounts[index].replace(/[$,]/g, ''))
        : 0;

      if (amount > 0) {
        receipts.push({
          receiptNumber: `RCP-${String(index + 1).padStart(6, '0')}`,
          date: this.parseDate(date),
          amount: Math.round(amount * 100), // Convert to cents
          items: [
            {
              description: 'Item',
              quantity: 1,
              unitPrice: Math.round(amount * 100),
              total: Math.round(amount * 100),
            },
          ],
          paymentMethod: 'Unknown',
        });
      }
    });

    return receipts.length > 0 ? receipts : [];
  }

  /**
   * Parses sales records from extracted text
   */
  private parseSalesRecords(text: string): SalesRecordData[] {
    // Simplified parser for sales records
    const records: SalesRecordData[] = [];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Extract total sales amounts
    const amountPattern = /(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const amounts = text.match(amountPattern) || [];

    months.forEach((month, index) => {
      const totalSales = amounts[index]
        ? Math.round(parseFloat(amounts[index].replace(/[$,]/g, '')) * 100)
        : 0;

      if (totalSales > 0) {
      records.push({
          recordId: `REC-2024-${String(index + 1).padStart(2, '0')}`,
          period: `${month} 2024`,
        totalSales,
          numberOfTransactions: Math.floor(Math.random() * 50) + 10,
          averageTransactionValue: Math.floor(totalSales / 20),
          topProducts: ['Products'],
        });
      }
    });

    return records.length > 0 ? records : [];
  }

  /**
   * Parses bank statements from extracted text
   */
  private parseBankStatements(text: string): BankStatementData[] {
    // Simplified parser for bank statements
    const statement: BankStatementData = {
      accountNumber: this.extractAccountNumber(text),
      accountName: this.extractAccountName(text),
      period: this.extractPeriod(text),
      openingBalance: 0,
      closingBalance: 0,
      totalCredits: 0,
      totalDebits: 0,
      transactions: this.parseTransactions(text),
    };

    // Calculate totals
    statement.totalCredits = statement.transactions.reduce(
      (sum, t) => sum + t.credit,
      0,
    );
    statement.totalDebits = statement.transactions.reduce(
      (sum, t) => sum + t.debit,
      0,
    );

    if (statement.transactions.length > 0) {
      statement.openingBalance = statement.transactions[0].balance - 
                                  statement.transactions[0].credit + 
                                  statement.transactions[0].debit;
      statement.closingBalance = statement.transactions[statement.transactions.length - 1].balance;
    }

    return [statement];
  }

  /**
   * Helper methods for parsing
   */
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private extractAccountNumber(text: string): string {
    const pattern = /account\s*(?:number|#)?\s*:?\s*(\d{10,})/i;
    const match = text.match(pattern);
    return match ? match[1] : '0000000000';
  }

  private extractAccountName(text: string): string {
    const pattern = /account\s*name\s*:?\s*([A-Za-z\s]+)/i;
    const match = text.match(pattern);
    return match ? match[1].trim() : 'Unknown Account';
  }

  private extractPeriod(text: string): { from: string; to: string } {
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
    const dates = text.match(datePattern) || [];

    return {
      from: dates[0] ? this.parseDate(dates[0]) : new Date().toISOString().split('T')[0],
      to: dates[dates.length - 1] ? this.parseDate(dates[dates.length - 1]) : new Date().toISOString().split('T')[0],
    };
  }

  private parseTransactions(text: string): BankStatementData['transactions'] {
    const transactions: BankStatementData['transactions'] = [];
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
    const amountPattern = /(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    
    const dates = text.match(datePattern) || [];
    const amounts = text.match(amountPattern) || [];

    let balance = 0;
    dates.forEach((date, index) => {
      const amount = amounts[index]
        ? parseFloat(amounts[index].replace(/[$,]/g, ''))
        : 0;

      if (amount > 0) {
        const isCredit = Math.random() > 0.5; // Simplified - in production, use better detection
        balance += isCredit ? amount : -amount;

            transactions.push({
          date: this.parseDate(date),
          description: 'Transaction',
          debit: isCredit ? 0 : Math.round(amount * 100),
          credit: isCredit ? Math.round(amount * 100) : 0,
          balance: Math.round(balance * 100),
        });
      }
    });

    return transactions;
  }

  /**
   * Cleans up a file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        this.logger.debug(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Cleans up temporary directory
   */
  private cleanup(): void {
    try {
      if (fs.pathExistsSync(this.tempDir)) {
        fs.removeSync(this.tempDir);
        this.logger.debug(`Cleaned up temporary directory: ${this.tempDir}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temporary directory: ${error.message}`);
    }
  }
}
