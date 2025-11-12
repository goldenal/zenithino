import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class AssessmentRequestDto {
  @ApiProperty({
    description: 'UUID of sales receipt document',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  salesReceiptDocumentId: string;

  @ApiProperty({
    description: 'UUID of sales record document',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  salesRecordDocumentId: string;

  @ApiProperty({
    description: 'UUID of bank statement document',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  bankStatementDocumentId: string;

  @ApiProperty({
    description: 'Amount requested (optional - system will calculate max)',
    example: 2500000,
    required: false,
  })
  @IsOptional()
  requestedAmount?: number;
}