import { Module } from '@nestjs/common';
import { AiValidatorService } from './ai-validator.service';

@Module({
  providers: [AiValidatorService],
  exports: [AiValidatorService],
})
export class AiValidatorModule {}