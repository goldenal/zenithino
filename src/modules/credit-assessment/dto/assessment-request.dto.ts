import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AssessmentRequestDto {
  @ApiProperty({
    description: 'Amount requested for the loan',
    example: 2500000,
  })
  @IsNumber()
  requestedAmount: number;
}
