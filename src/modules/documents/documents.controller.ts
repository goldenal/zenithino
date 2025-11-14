import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
  Injectable,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentType } from '../../common/enums/document-type.enum';
import { Multer } from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Supported MIME types
const SUPPORTED_MIME_TYPES = [
  'application/pdf', // Standard PDF MIME type
  'application/x-pdf', // Alternative PDF MIME type
  'application/acrobat', // Adobe Acrobat
  'applications/vnd.pdf', // Another PDF variant
  'text/pdf', // Text PDF (less common)
  'text/x-pdf', // Another PDF variant
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// Supported file extensions
const SUPPORTED_EXTENSIONS = /\.(jpg|jpeg|png|pdf)$/i;//

// Custom file type validator that checks both MIME type and file extension
@Injectable()
export class DocumentFileTypeValidator extends FileValidator<
  Record<string, any>,
  Multer.File
> {
  constructor() {
    super({});
  }

  isValid(file?: Multer.File): boolean {
    if (!file) {
      return false;
    }

    const mimetype = file.mimetype || '';
    const originalname = file.originalname || '';
    const lowerFilename = originalname.toLowerCase();

    // Check if MIME type is in supported list
    const isValidMimeType = SUPPORTED_MIME_TYPES.includes(mimetype);

    // Check if file extension is supported
    const isValidExtension = SUPPORTED_EXTENSIONS.test(originalname);

    // Accept PDFs if MIME type indicates PDF or extension is .pdf
    // This ensures application/pdf and all PDF variants are accepted
    if (mimetype.includes('pdf') || lowerFilename.endsWith('.pdf')) {
      return true;
    }

    // Accept images if MIME type is valid image type or extension is image
    if (
      mimetype.startsWith('image/') &&
      (isValidMimeType || isValidExtension)
    ) {
      return true;
    }

    // Fallback: accept if extension is valid (for cases where MIME type might be wrong)
    if (
      isValidExtension &&
      (mimetype.startsWith('image/') || mimetype.includes('pdf'))
    ) {
      return true;
    }

    return false;
  }

  buildErrorMessage(file: Multer.File): string {
    const mimetype = file.mimetype || 'unknown';
    const originalname = file.originalname || 'unknown';
    return `File type not supported. Supported types: PDF (application/pdf and variants), JPEG, PNG. Received: MIME type: ${mimetype}, filename: ${originalname}`;
  }
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine format from MIME type or file extension
    let format: string;
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('pdf') ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      format = 'pdf';
    } else if (file.mimetype.startsWith('image/')) {
      format = file.mimetype.split('/')[1]; // e.g., 'png', 'jpeg'
      // Normalize jpg to jpeg for Cloudinary
      if (format === 'jpg') {
        format = 'jpeg';
      }
    } else {
      // Fallback: extract from filename
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      format = ext || 'auto';
    }

    const isPdf = format === 'pdf';

    return {
      folder: 'zenithino_documents',
      format: format,
      resource_type: isPdf ? 'raw' : 'image', // PDFs should be stored as raw files
      public_id: `${file.fieldname}-${Date.now()}`,
      // Ensure files are publicly accessible
      access_mode: 'public', // Explicitly set to public
      type: 'upload', // Ensure authenticated upload but public access
      // Additional options for better organization
      use_filename: false, // Don't use original filename to avoid conflicts
      unique_filename: true, // Ensure unique filenames
      // For raw files (PDFs), ensure they're accessible via public URL
      ...(isPdf && {
        allowed_formats: ['pdf'], // Only allow PDF format
      }),
    };
  },
});

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document for OCR processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          enum: Object.values(DocumentType),
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: storage }))
  async uploadDocument(
    @CurrentUser() user: any,
    @Body('documentType') documentType: DocumentType,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB (increased to match OCR service)
          new DocumentFileTypeValidator(), // Custom validator that accepts all PDF types
        ],
      }),
    )
    file: Multer.File,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.uploadDocument(
      user.userId,
      file,
      documentType,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for current user' })
  async getUserDocuments(
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto[]> {
    return this.documentsService.getUserDocuments(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific document by ID' })
  async getDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsService.getDocumentById(
      id,
      user.userId,
    );
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.documentsService.deleteDocument(id, user.userId);
    return { message: 'Document deleted successfully' };
  }
}
