import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentType } from '../../common/enums/document-type.enum';
import { Multer } from 'multer';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  const mockDocumentsService = {
    uploadDocument: jest.fn(),
    getUserDocuments: jest.fn(),
    getDocumentById: jest.fn(),
    deleteDocument: jest.fn(),
  };

  const mockCurrentUser = {
    userId: 'user-id-123',
    email: 'test@example.com',
  };

  const mockFile: Multer.File = {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: 'test-document.pdf',
    path: 'https://cloudinary.com/test-document.pdf',
    stream: null as any,
  };

  const mockDocument: DocumentResponseDto = {
    id: 'doc-id-123',
    documentType: DocumentType.BANK_STATEMENT,
    filename: 'test-document.pdf',
    fileUrl: 'https://cloudinary.com/test-document.pdf',
    status: 'pending',
    extractedData: null,
    createdAt: new Date(),
  };

  const mockDocumentWithData: DocumentResponseDto = {
    ...mockDocument,
    status: 'processed',
    extractedData: {
      accountNumber: '1234567890',
      accountName: 'Test Account',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      mockDocumentsService.uploadDocument.mockResolvedValue(mockDocument);

      const result = await controller.uploadDocument(
        mockCurrentUser,
        DocumentType.BANK_STATEMENT,
        mockFile,
      );

      expect(service.uploadDocument).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        mockFile,
        DocumentType.BANK_STATEMENT,
      );
      expect(result).toEqual(mockDocument);
      expect(result.documentType).toBe(DocumentType.BANK_STATEMENT);
      expect(result.fileUrl).toBeDefined();
    });

    it('should upload different document types', async () => {
      const salesReceiptDoc = {
        ...mockDocument,
        documentType: DocumentType.SALES_RECEIPT,
      };

      mockDocumentsService.uploadDocument.mockResolvedValue(salesReceiptDoc);

      const result = await controller.uploadDocument(
        mockCurrentUser,
        DocumentType.SALES_RECEIPT,
        mockFile,
      );

      expect(service.uploadDocument).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        mockFile,
        DocumentType.SALES_RECEIPT,
      );
      expect(result.documentType).toBe(DocumentType.SALES_RECEIPT);
    });

    it('should handle upload errors', async () => {
      mockDocumentsService.uploadDocument.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        controller.uploadDocument(
          mockCurrentUser,
          DocumentType.BANK_STATEMENT,
          mockFile,
        ),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getUserDocuments', () => {
    it('should return all user documents', async () => {
      const mockDocuments: DocumentResponseDto[] = [
        mockDocument,
        {
          ...mockDocument,
          id: 'doc-id-456',
          documentType: DocumentType.SALES_RECEIPT,
        },
      ];

      mockDocumentsService.getUserDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.getUserDocuments(mockCurrentUser);

      expect(service.getUserDocuments).toHaveBeenCalledWith(
        mockCurrentUser.userId,
      );
      expect(result).toEqual(mockDocuments);
      expect(result.length).toBe(2);
    });

    it('should return empty array when user has no documents', async () => {
      mockDocumentsService.getUserDocuments.mockResolvedValue([]);

      const result = await controller.getUserDocuments(mockCurrentUser);

      expect(service.getUserDocuments).toHaveBeenCalledWith(
        mockCurrentUser.userId,
      );
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getDocument', () => {
    it('should return a specific document by ID', async () => {
      const documentEntity = {
        id: 'doc-id-123',
        documentType: DocumentType.BANK_STATEMENT,
        filename: 'test-document.pdf',
        fileUrl: 'https://cloudinary.com/test-document.pdf',
        status: 'processed',
        extractedData: { accountNumber: '1234567890' },
        createdAt: new Date(),
      };

      mockDocumentsService.getDocumentById.mockResolvedValue(documentEntity);

      const result = await controller.getDocument(
        mockCurrentUser,
        'doc-id-123',
      );

      expect(service.getDocumentById).toHaveBeenCalledWith(
        'doc-id-123',
        mockCurrentUser.userId,
      );
      expect(result).toEqual({
        id: documentEntity.id,
        documentType: documentEntity.documentType,
        filename: documentEntity.filename,
        fileUrl: documentEntity.fileUrl,
        status: documentEntity.status,
        extractedData: documentEntity.extractedData,
        createdAt: documentEntity.createdAt,
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      mockDocumentsService.getDocumentById.mockRejectedValue(
        new NotFoundException('Document not found'),
      );

      await expect(
        controller.getDocument(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(service.getDocumentById).toHaveBeenCalledWith(
        'non-existent-id',
        mockCurrentUser.userId,
      );
    });

    it('should throw NotFoundException when document belongs to different user', async () => {
      mockDocumentsService.getDocumentById.mockRejectedValue(
        new NotFoundException('Document not found'),
      );

      await expect(
        controller.getDocument(mockCurrentUser, 'doc-id-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      const documentEntity = {
        id: 'doc-id-123',
        userId: mockCurrentUser.userId,
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      mockDocumentsService.getDocumentById.mockResolvedValue(documentEntity);
      mockDocumentsService.deleteDocument.mockResolvedValue(undefined);

      const result = await controller.deleteDocument(
        mockCurrentUser,
        'doc-id-123',
      );

      expect(service.deleteDocument).toHaveBeenCalledWith(
        'doc-id-123',
        mockCurrentUser.userId,
      );
      expect(result).toEqual({ message: 'Document deleted successfully' });
    });

    it('should throw NotFoundException when document not found', async () => {
      mockDocumentsService.deleteDocument.mockRejectedValue(
        new NotFoundException('Document not found'),
      );

      await expect(
        controller.deleteDocument(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(service.deleteDocument).toHaveBeenCalledWith(
        'non-existent-id',
        mockCurrentUser.userId,
      );
    });

    it('should throw NotFoundException when trying to delete another user document', async () => {
      mockDocumentsService.deleteDocument.mockRejectedValue(
        new NotFoundException('Document not found'),
      );

      await expect(
        controller.deleteDocument(mockCurrentUser, 'doc-id-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

