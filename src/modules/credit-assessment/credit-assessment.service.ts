import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreditAssessment } from './entities/credit-assessment.entity';
import { DocumentsService } from '../documents/documents.service';
import { AiValidatorService } from '../ai-validator/ai-validator.service';
import { AssessmentRequestDto } from './dto/assessment-request.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';
import { DocumentType } from '../../common/enums/document-type.enum';
import { User } from '../users/entities/user.entity';
import { UserProfileDto } from '../users/dto/user-profile.dto';

@Injectable()
export class CreditAssessmentService {
  constructor(
    @InjectModel(CreditAssessment)
    private assessmentModel: typeof CreditAssessment,
    private documentsService: DocumentsService,
    private aiValidatorService: AiValidatorService,
  ) {}

  async createAssessment(
    userId: string,
    requestDto: AssessmentRequestDto,
  ): Promise<AssessmentResponseDto> {
    // Fetch latest processed documents
    const salesReceiptDoc =
      await this.documentsService.findLastProcessedForUser(
        userId,
        DocumentType.SALES_RECEIPT,
      );
    const salesRecordDoc = await this.documentsService.findLastProcessedForUser(
      userId,
      DocumentType.SALES_RECORD,
    );
    const bankStatementDoc =
      await this.documentsService.findLastProcessedForUser(
        userId,
        DocumentType.BANK_STATEMENT,
      );

    // Create pending assessment
    const assessment = await this.assessmentModel.create({
      userId,
      creditScore: 0,
      riskLevel: 'MEDIUM',
      defaultProbability: 0,
      maxLoanAmount: 0,
      expectedLoss: 0,
      status: 'pending',
    });

    // Process assessment asynchronously
    await this.processAssessment(
      assessment.id,
      salesReceiptDoc.extractedData,
      salesRecordDoc.extractedData,
      bankStatementDoc.extractedData,
      requestDto.requestedAmount,
    );

    return this.toResponseDto(assessment);
  }

  private async processAssessment(
    assessmentId: string,
    salesReceiptData: any,
    salesRecordData: any,
    bankStatementData: any,
    requestedAmount: number,
  ): Promise<void> {
    try {
      // Step 1: Validate documents
      const validationResult = await this.aiValidatorService.validateDocuments(
        salesReceiptData,
        salesRecordData,
        bankStatementData,
      );

      // Step 2: Calculate credit score
      const creditScore = await this.aiValidatorService.calculateCreditScore(
        validationResult,
        salesReceiptData,
        salesRecordData,
        bankStatementData,
        requestedAmount,
      );

      // Step 3: Update assessment
      await this.assessmentModel.update(
        {
          creditScore: creditScore.score,
          riskLevel: creditScore.riskLevel,
          defaultProbability: creditScore.defaultProbability,
          maxLoanAmount: creditScore.maxLoanAmount,
          expectedLoss: creditScore.expectedLoss,
          validationResult,
          financialSummary: creditScore.financialSummary,
          riskAnalysis: creditScore.riskAnalysis,
          creditFactors: creditScore.factors,
          status: 'completed',
        },
        {
          where: { id: assessmentId },
        },
      );
    } catch (error) {
      await this.assessmentModel.update(
        {
          status: 'failed',
        },
        {
          where: { id: assessmentId },
        },
      );
      throw error;
    }
  }

  async getAssessment(
    id: string,
    userId: string,
  ): Promise<AssessmentResponseDto> {
    const assessment = await this.assessmentModel.findOne({
      where: { id, userId },
      include: [
        {
          model: User,
          attributes: [
            'id',
            'fullName',
            'email',
            'businessName',
            'phoneNumber',
            'role',
            'bvn',
            'createdAt',
          ],
        },
      ],
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return this.toResponseDto(assessment);
  }

  async getUserAssessments(userId: string): Promise<AssessmentResponseDto[]> {
    const assessments = await this.assessmentModel.findAll({
      where: { userId },
      include: [
        {
          model: User,
          attributes: [
            'id',
            'fullName',
            'email',
            'businessName',
            'phoneNumber',
            'role',
            'bvn',
            'createdAt',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return assessments.map((assessment) => this.toResponseDto(assessment));
  }

  async getAllAssessments(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<{ rows: AssessmentResponseDto[]; count: number }> {
    const offset = (page - 1) * pageSize;
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const { rows, count } = await this.assessmentModel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: [
            'id',
            'fullName',
            'email',
            'businessName',
            'phoneNumber',
            'role',
            'bvn',
            'createdAt',
          ],
        },
      ],
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      rows: rows.map((assessment) => this.toResponseDto(assessment)),
      count,
    };
  }

  private toResponseDto(assessment: CreditAssessment): AssessmentResponseDto {
    const userProfile: UserProfileDto | undefined = assessment.user
      ? {
          id: assessment.user.id,
          fullName: assessment.user.fullName,
          email: assessment.user.email,
          businessName: assessment.user.businessName,
          phoneNumber: assessment.user.phoneNumber,
          role: assessment.user.role,
          bvn: assessment.user.bvn,
          createdAt: assessment.user.createdAt,
        }
      : undefined;

    return {
      id: assessment.id,
      userId: assessment.userId,
      creditScore: assessment.creditScore,
      riskLevel: assessment.riskLevel,
      defaultProbability: assessment.defaultProbability,
      maxLoanAmount: parseFloat(assessment.maxLoanAmount as any),
      expectedLoss: parseFloat(assessment.expectedLoss as any),
      lossRate:
        assessment.defaultProbability > 0
          ? Math.round((assessment.defaultProbability / 100) * 1000) / 10
          : 0,
      financialSummary: assessment.financialSummary,
      riskAnalysis: assessment.riskAnalysis,
      businessFlowValidation:
        assessment.validationResult?.businessFlowValidation || {},
      validationInsights: assessment.validationResult?.insights || [],
      creditFactors: assessment.creditFactors || [],
      status: assessment.status,
      createdAt: assessment.createdAt,
      user: userProfile,
    };
  }
}
