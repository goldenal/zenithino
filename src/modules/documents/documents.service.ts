import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from './entities/document.entity';
import { OcrService } from '../ocr/ocr.service';
import { DocumentType } from '../../common/enums/document-type.enum';
import { DocumentResponseDto } from './dto/document-response.dto';
import { Multer } from 'multer';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document)
    private documentModel: typeof Document,
    private ocrService: OcrService,
  ) {}

  async uploadDocument(
    userId: string,
    file: Multer.File,
    documentType: DocumentType,
  ): Promise<DocumentResponseDto> {
    const fileUrl = file.path; // Cloudinary URL
    const filename = file.originalname; // Original filename

    const document = await this.documentModel.create({
      userId,
      documentType,
      filename,
      fileUrl,
      status: 'pending',
    });

    // Process OCR asynchronously (simulated)
    this.processDocument(document.id, file, documentType);

    return this.toResponseDto(document);
  }

  private async processDocument(
    documentId: string,
    file: Multer.File,
    documentType: DocumentType,
  ): Promise<void> {
    try {
      // Assuming ocrService can handle the file object with Cloudinary path
      const extractedData = await this.ocrService.extractText(
        file,
        documentType,
      );

      await this.documentModel.update(
        {
          extractedData,
          status: 'processed',
        },
        {
          where: { id: documentId },
        },
      );
    } catch (error) {
      await this.documentModel.update(
        {
          status: 'failed',
        },
        {
          where: { id: documentId },
        },
      );
    }
  }

  async getUserDocuments(userId: string): Promise<DocumentResponseDto[]> {
    const documents = await this.documentModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return documents.map((doc) => this.toResponseDto(doc));
  }

  async getDocumentById(id: string, userId: string): Promise<Document> {
    const document = await this.documentModel.findOne({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDocumentsByType(
    userId: string,
    documentType: DocumentType,
  ): Promise<Document[]> {
    return this.documentModel.findAll({
      where: { userId, documentType, status: 'processed' },
    });
  }

  async findLastProcessedForUser(
    userId: string,
    documentType: DocumentType,
  ): Promise<Document> {
    const document = await this.documentModel.findOne({
      where: {
        userId,
        documentType,
        status: 'processed',
      },
      order: [['createdAt', 'DESC']],
    });

    if (!document) {
      throw new NotFoundException(
        `No processed ${documentType} document found for this user.`,
      );
    }

    return document;
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    const document = await this.getDocumentById(id, userId);
    await document.destroy();
  }
  private toResponseDto(document: Document): DocumentResponseDto {
    return {
      id: document.id,
      documentType: document.documentType,
      filename: document.filename,
      fileUrl: document.fileUrl,
      status: document.status,
      extractedData: document.extractedData,
      createdAt: document.createdAt,
    };
  }
}
