import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentType } from '../../../common/enums/document-type.enum';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.SALES_RECEIPT })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}