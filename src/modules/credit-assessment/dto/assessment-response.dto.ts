import { ApiProperty } from '@nestjs/swagger';
import { RiskLevel } from '../../../common/enums/risk-level.enum';

export class AssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ example: 85 })
  creditScore: number;

  @ApiProperty({ enum: RiskLevel, example: RiskLevel.LOW })
  riskLevel: RiskLevel;

  @ApiProperty({ example: 2.5 })
  defaultProbability: number;

  @ApiProperty({ example: 2500000 })
  maxLoanAmount: number;

  @ApiProperty({ example: 50000 })
  expectedLoss: number;

  @ApiProperty({ example: 2.0 })
  lossRate: number;

  @ApiProperty()
  financialSummary: {
    averageMonthlyInflow: number;
    averageMonthlyOutflow: number;
    netAverage: number;
    cashFlowPattern: string;
    monthsAnalyzed: number;
  };

  @ApiProperty()
  riskAnalysis: {
    roundTripTransactions: {
      detected: number;
      percentage: number;
      details: string[];
    };
    consistencyScore: number;
    fraudIndicators: string[];
  };

  @ApiProperty()
  businessFlowValidation: {
    salesReceiptsMatch: {
      percentage: number;
      matchedTransactions: number;
      totalReceipts: number;
    };
    salesRecordsAlignment: {
      percentage: number;
      alignedMonths: number;
      totalMonths: number;
    };
  };

  @ApiProperty()
  validationInsights: Array<{
    type: string;
    message: string;
    impact: string;
  }>;

  @ApiProperty()
  creditFactors: Array<{
    factor: string;
    value: string;
    impact: string;
    weight: number;
  }>;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}