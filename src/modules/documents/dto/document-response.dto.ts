import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../common/enums/document-type.enum';

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  fileUrl: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  extractedData?: any;

  @ApiProperty()
  createdAt: Date;
}