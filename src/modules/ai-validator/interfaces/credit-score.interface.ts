import { RiskLevel } from '../../../common/enums/risk-level.enum';

export interface CreditScore {
  score: number;
  riskLevel: RiskLevel;
  defaultProbability: number;
  maxLoanAmount: number;
  expectedLoss: number;
  lossRate: number;
  financialSummary: FinancialSummary;
  riskAnalysis: RiskAnalysis;
  businessFlowValidation: BusinessFlowValidation;
  factors: CreditFactor[];
}

export interface FinancialSummary {
  averageMonthlyInflow: number;
  averageMonthlyOutflow: number;
  netAverage: number;
  cashFlowPattern: string;
  monthsAnalyzed: number;
}

export interface RiskAnalysis {
  roundTripTransactions: {
    detected: number;
    percentage: number;
    details: string[];
  };
  consistencyScore: number;
  fraudIndicators: string[];
}

export interface BusinessFlowValidation {
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
}

export interface CreditFactor {
  factor: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}