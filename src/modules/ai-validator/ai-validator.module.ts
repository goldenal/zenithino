import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiValidatorService } from './ai-validator.service';
import geminiConfig from '../../config/gemini.config';

@Module({
  imports: [ConfigModule.forFeature(geminiConfig)],
  providers: [AiValidatorService],
  exports: [AiValidatorService],
})
export class AiValidatorModule {}
