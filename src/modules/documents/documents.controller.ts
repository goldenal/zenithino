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
    FileTypeValidator,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import { DocumentsService } from './documents.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../common/decorators/current-user.decorator';
  import { UploadDocumentDto } from './dto/upload-document.dto';
  import { DocumentResponseDto } from './dto/document-response.dto';
  import { DocumentType } from '../../common/enums/document-type.enum';
  import { Multer } from 'multer';
  
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
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
      }),
    )
    async uploadDocument(
      @CurrentUser() user: any,
      @Body('documentType') documentType: DocumentType,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
          ],
        }),
      )
      file: Multer.File,
    ): Promise<DocumentResponseDto> {
      return this.documentsService.uploadDocument(user.userId, file, documentType);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all documents for current user' })
    async getUserDocuments(@CurrentUser() user: any): Promise<DocumentResponseDto[]> {
      return this.documentsService.getUserDocuments(user.userId);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific document by ID' })
    async getDocument(
      @CurrentUser() user: any,
      @Param('id') id: string,
    ): Promise<DocumentResponseDto> {
      const document = await this.documentsService.getDocumentById(id, user.userId);
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