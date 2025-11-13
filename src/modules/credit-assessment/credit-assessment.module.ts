import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CreditAssessmentController } from './credit-assessment.controller';
import { CreditAssessmentService } from './credit-assessment.service';
import { CreditAssessment } from './entities/credit-assessment.entity';
import { DocumentsModule } from '../documents/documents.module';
import { AiValidatorModule } from '../ai-validator/ai-validator.module';

@Module({
  imports: [
    SequelizeModule.forFeature([CreditAssessment]),
    DocumentsModule,
    AiValidatorModule,
  ],
  controllers: [CreditAssessmentController],
  providers: [CreditAssessmentService],
  exports: [CreditAssessmentService],
})
export class CreditAssessmentModule {}
