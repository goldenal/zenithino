import { Injectable } from '@nestjs/common';
import {
  ExtractedData,
  SalesReceiptData,
  SalesRecordData,
  BankStatementData,
} from '../ocr/interfaces/extracted-data.interface';
import { ValidationResult, ValidationInsight, Discrepancy } from './interfaces/validation-result.interface';
import { CreditScore, FinancialSummary, RiskAnalysis, BusinessFlowValidation, CreditFactor } from './interfaces/credit-score.interface';
import { RiskLevel } from '../../common/enums/risk-level.enum';

@Injectable()
export class AiValidatorService {
  // Simulated AI validation
  async validateDocuments(
    salesReceipts: ExtractedData,
    salesRecords: ExtractedData,
    bankStatement: ExtractedData,
  ): Promise<ValidationResult> {
    // Simulate processing delay
    await this.delay(2000);

    const receipts = salesReceipts.structuredData.salesReceipts || [];
    const records = salesRecords.structuredData.salesRecords || [];
    const statement = bankStatement.structuredData.bankStatements?.[0];

    if (!statement) {
      throw new Error('Bank statement data is required');
    }

    // Calculate match percentages
    const receiptMatchPercentage = this.calculateReceiptBankMatch(receipts, statement);
    const recordMatchPercentage = this.calculateRecordBankMatch(records, statement);
    
    const overallMatch = (receiptMatchPercentage + recordMatchPercentage) / 2;

    const insights = this.generateInsights(receiptMatchPercentage, recordMatchPercentage, statement);
    const discrepancies = this.identifyDiscrepancies(receipts, records, statement);

    return {
      isValid: overallMatch >= 75,
      matchPercentage: Math.round(overallMatch),
      insights,
      discrepancies,
      recommendations: this.generateRecommendations(overallMatch, discrepancies),
    };
  }

  // Simulated credit score calculation
  async calculateCreditScore(
    validationResult: ValidationResult,
    salesReceipts: ExtractedData,
    salesRecords: ExtractedData,
    bankStatement: ExtractedData,
  ): Promise<CreditScore> {
    // Simulate processing delay
    await this.delay(1500);

    const statement = bankStatement.structuredData.bankStatements?.[0];
    const receipts = salesReceipts.structuredData.salesReceipts || [];
    const records = salesRecords.structuredData.salesRecords || [];

    if (!statement) {
      throw new Error('Bank statement data is required');
    }

    // Calculate financial metrics
    const financialSummary = this.calculateFinancialSummary(statement);
    const riskAnalysis = this.performRiskAnalysis(statement, receipts);
    const businessFlowValidation = this.validateBusinessFlow(receipts, records, statement);

    // Calculate base score from validation
    let baseScore = Math.round((validationResult.matchPercentage / 100) * 60); // Max 60 points from validation

    // Add points from financial health (max 25 points)
    const financialHealthScore = this.calculateFinancialHealthScore(financialSummary);
    baseScore += financialHealthScore;

    // Add points from risk factors (max 15 points)
    const riskScore = this.calculateRiskScore(riskAnalysis);
    baseScore += riskScore;

    // Ensure score is between 0-100
    const finalScore = Math.min(Math.max(baseScore, 0), 100);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(finalScore, riskAnalysis);
    
    // Calculate default probability
    const defaultProbability = this.calculateDefaultProbability(finalScore, riskLevel);

    // Calculate max loan amount based on cash flow
    const maxLoanAmount = this.calculateMaxLoanAmount(financialSummary, finalScore);

    // Calculate expected loss
    const lossRate = defaultProbability / 100;
    const expectedLoss = Math.round(maxLoanAmount * lossRate * 0.5); // 50% recovery rate assumed

    // Generate credit factors
    const factors = this.generateCreditFactors(
      validationResult,
      financialSummary,
      riskAnalysis,
      businessFlowValidation,
    );

    return {
      score: finalScore,
      riskLevel,
      defaultProbability,
      maxLoanAmount,
      expectedLoss,
      lossRate: Math.round(lossRate * 1000) / 10, // Convert to percentage with 1 decimal
      financialSummary,
      riskAnalysis,
      businessFlowValidation,
      factors,
    };
  }

  private calculateReceiptBankMatch(
    receipts: SalesReceiptData[],
    statement: BankStatementData,
  ): number {
    if (!receipts.length) return 0;

    let matchedCount = 0;
    const creditTransactions = statement.transactions.filter(t => t.credit > 0);

    receipts.forEach(receipt => {
      const matchingTransaction = creditTransactions.find(t => {
        const dateDiff = Math.abs(
          new Date(receipt.date).getTime() - new Date(t.date).getTime()
        ) / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(receipt.amount - t.credit) / receipt.amount;
        
        return dateDiff <= 2 && amountDiff <= 0.05; // Within 2 days and 5% amount difference
      });

      if (matchingTransaction) matchedCount++;
    });

    return (matchedCount / receipts.length) * 100;
  }

  private calculateRecordBankMatch(
    records: SalesRecordData[],
    statement: BankStatementData,
  ): number {
    if (!records.length) return 0;

    let matchedMonths = 0;

    records.forEach(record => {
      const monthTransactions = statement.transactions.filter(t => {
        const transMonth = new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        return transMonth === record.period && t.credit > 0;
      });

      const monthTotal = monthTransactions.reduce((sum, t) => sum + t.credit, 0);
      const difference = Math.abs(monthTotal - record.totalSales) / record.totalSales;

      if (difference <= 0.15) matchedMonths++; // Within 15% difference
    });

    return (matchedMonths / records.length) * 100;
  }

  private generateInsights(
    receiptMatch: number,
    recordMatch: number,
    statement: BankStatementData,
  ): ValidationInsight[] {
    const insights: ValidationInsight[] = [];

    // Receipt match insights
    if (receiptMatch >= 85) {
      insights.push({
        type: 'positive',
        message: `Strong correlation (${Math.round(receiptMatch)}%) between sales receipts timestamps and bank deposits, indicating genuine business transactions.`,
        impact: 'high',
      });
    } else if (receiptMatch >= 70) {
      insights.push({
        type: 'warning',
        message: `Moderate correlation (${Math.round(receiptMatch)}%) between sales receipts and bank deposits. Some discrepancies detected.`,
        impact: 'medium',
      });
    } else {
      insights.push({
        type: 'negative',
        message: `Low correlation (${Math.round(receiptMatch)}%) between sales receipts and bank deposits. Significant discrepancies found.`,
        impact: 'high',
      });
    }

    // Cash flow insights
    const avgMonthlyInflow = statement.totalCredits / 12;
    if (avgMonthlyInflow >= 200000) {
      insights.push({
        type: 'positive',
        message: `Consistent monthly cash flow pattern over 14 months with positive net income averaging ₦${Math.round(avgMonthlyInflow).toLocaleString()}/month.`,
        impact: 'high',
      });
    }

    // Round-tripping analysis
    const roundTripPercentage = this.calculateRoundTripping(statement);
    if (roundTripPercentage <= 10) {
      insights.push({
        type: 'positive',
        message: `Low round-tripping detected (${roundTripPercentage}%), well within acceptable threshold. Most flagged transactions have valid business justification.`,
        impact: 'medium',
      });
    } else if (roundTripPercentage <= 20) {
      insights.push({
        type: 'warning',
        message: `Moderate round-tripping detected (${roundTripPercentage}%). Some transactions require further review.`,
        impact: 'medium',
      });
    }

    // Business separation
    insights.push({
      type: 'warning',
      message: 'Personal account usage, however, clear separation of business vs personal transactions visible in patterns.',
      impact: 'low',
    });

    return insights;
  }

  private identifyDiscrepancies(
    receipts: SalesReceiptData[],
    records: SalesRecordData[],
    statement: BankStatementData,
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Check for missing receipts
    const missingReceiptsMonths = this.findMissingReceiptsMonths(receipts, records);
    if (missingReceiptsMonths.length > 0) {
      discrepancies.push({
        type: 'Missing Documentation',
        description: `Sales receipts missing or incomplete for ${missingReceiptsMonths.join(', ')}`,
        severity: 'moderate',
        affectedPeriod: missingReceiptsMonths.join(', '),
      });
    }

    // Check for amount mismatches
    records.forEach(record => {
      const monthTransactions = statement.transactions.filter(t => {
        const transMonth = new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        return transMonth === record.period && t.credit > 0;
      });

      const monthTotal = monthTransactions.reduce((sum, t) => sum + t.credit, 0);
      const difference = Math.abs(monthTotal - record.totalSales);
      const percentDiff = (difference / record.totalSales) * 100;

      if (percentDiff > 20) {
        discrepancies.push({
          type: 'Amount Mismatch',
          description: `Significant difference (${Math.round(percentDiff)}%) between reported sales (₦${record.totalSales.toLocaleString()}) and bank inflows (₦${Math.round(monthTotal).toLocaleString()}) for ${record.period}`,
          severity: 'moderate',
          affectedPeriod: record.period,
        });
      }
    });

    return discrepancies;
  }

  private generateRecommendations(
    matchPercentage: number,
    discrepancies: Discrepancy[],
  ): string[] {
    const recommendations: string[] = [];

    if (matchPercentage >= 85) {
      recommendations.push('Applicant demonstrates strong financial documentation and transparency');
      recommendations.push('Recommend approval with standard terms');
    } else if (matchPercentage >= 70) {
      recommendations.push('Request clarification on identified discrepancies before approval');
      recommendations.push('Consider slightly conservative loan terms');
    } else {
      recommendations.push('Significant concerns identified - request additional documentation');
      recommendations.push('Consider rejection or substantial risk premium');
    }

    if (discrepancies.some(d => d.severity === 'critical')) {
      recommendations.push('Critical discrepancies detected - thorough review required');
    }

    return recommendations;
  }

  private calculateFinancialSummary(statement: BankStatementData): FinancialSummary {
    const monthlyData: { [key: string]: { inflow: number; outflow: number } } = {};

    statement.transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { inflow: 0, outflow: 0 };
      }
      monthlyData[month].inflow += t.credit;
      monthlyData[month].outflow += t.debit;
    });

    const months = Object.keys(monthlyData);
    const avgInflow = Object.values(monthlyData).reduce((sum, m) => sum + m.inflow, 0) / months.length;
    const avgOutflow = Object.values(monthlyData).reduce((sum, m) => sum + m.outflow, 0) / months.length;
    const netAvg = avgInflow - avgOutflow;

    // Determine cash flow pattern
    let cashFlowPattern = 'Consistent pattern';
    const monthlyNets = Object.values(monthlyData).map(m => m.inflow - m.outflow);
    const positiveMonths = monthlyNets.filter(n => n > 0).length;
    
    if (positiveMonths >= 10) {
      cashFlowPattern = 'Consistent pattern';
    } else if (positiveMonths >= 7) {
      cashFlowPattern = 'Mostly positive';
    } else {
      cashFlowPattern = 'Irregular pattern';
    }

    return {
      averageMonthlyInflow: Math.round(avgInflow),
      averageMonthlyOutflow: Math.round(avgOutflow),
      netAverage: Math.round(netAvg),
      cashFlowPattern,
      monthsAnalyzed: months.length,
    };
  }

  private performRiskAnalysis(
    statement: BankStatementData,
    receipts: SalesReceiptData[],
  ): RiskAnalysis {
    const roundTripPercentage = this.calculateRoundTripping(statement);
    const roundTripCount = Math.round((statement.transactions.length * roundTripPercentage) / 100);

    const details = [
      'Same day deposits and withdrawals of similar amounts',
      'Repetitive transaction patterns with consistent counterparties',
      'Unusual transaction velocity during specific periods',
      'Cross-referenced with sales receipts and records timestamps',
    ];

    // Calculate consistency score
    const consistencyScore = Math.round(92 + Math.random() * 6); // 92-98%

    const fraudIndicators: string[] = [];
    if (roundTripPercentage > 20) {
      fraudIndicators.push('High round-tripping detected');
    }
    if (consistencyScore < 85) {
      fraudIndicators.push('Inconsistent transaction patterns');
    }

    return {
      roundTripTransactions: {
        detected: roundTripCount,
        percentage: roundTripPercentage,
        details,
      },
      consistencyScore,
      fraudIndicators,
    };
  }

  private validateBusinessFlow(
    receipts: SalesReceiptData[],
    records: SalesRecordData[],
    statement: BankStatementData,
  ): BusinessFlowValidation {
    const receiptMatch = this.calculateReceiptBankMatch(receipts, statement);
    const recordMatch = this.calculateRecordBankMatch(records, statement);

    const matchedReceipts = Math.round((receipts.length * receiptMatch) / 100);
    const alignedMonths = Math.round((records.length * recordMatch) / 100);

    return {
      salesReceiptsMatch: {
        percentage: Math.round(receiptMatch),
        matchedTransactions: matchedReceipts,
        totalReceipts: receipts.length,
      },
      salesRecordsAlignment: {
        percentage: Math.round(recordMatch),
        alignedMonths,
        totalMonths: records.length,
      },
    };
  }

  private calculateFinancialHealthScore(summary: FinancialSummary): number {
    let score = 0;

    // Positive cash flow (0-10 points)
    if (summary.netAverage > 0) {
      score += Math.min(10, (summary.netAverage / 100000) * 2);
    }

    // Consistent pattern (0-10 points)
    if (summary.cashFlowPattern === 'Consistent pattern') {
      score += 10;
    } else if (summary.cashFlowPattern === 'Mostly positive') {
      score += 6;
    }

    // Inflow strength (0-5 points)
    score += Math.min(5, (summary.averageMonthlyInflow / 500000) * 5);

    return Math.round(score);
  }

  private calculateRiskScore(analysis: RiskAnalysis): number {
    let score = 15; // Start with max points

    // Deduct for round-tripping
    if (analysis.roundTripTransactions.percentage > 20) {
      score -= 8;
    } else if (analysis.roundTripTransactions.percentage > 10) {
      score -= 4;
    }

    // Deduct for low consistency
    if (analysis.consistencyScore < 85) {
      score -= 5;
    } else if (analysis.consistencyScore < 90) {
      score -= 2;
    }

    // Deduct for fraud indicators
    score -= analysis.fraudIndicators.length * 2;

    return Math.max(0, score);
  }

  private determineRiskLevel(score: number, analysis: RiskAnalysis): RiskLevel {
    if (analysis.fraudIndicators.length >= 3) {
      return RiskLevel.VERY_HIGH;
    }

    if (score >= 80) return RiskLevel.VERY_LOW;
    if (score >= 65) return RiskLevel.LOW;
    if (score >= 50) return RiskLevel.MEDIUM;
    if (score >= 35) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  private calculateDefaultProbability(score: number, riskLevel: RiskLevel): number {
    // Base probability from score
    let probability = Math.round(100 - score);

    // Adjust based on risk level
    switch (riskLevel) {
      case RiskLevel.VERY_LOW:
        probability = Math.min(probability, 5);
        break;
      case RiskLevel.LOW:
        probability = Math.min(probability, 15);
        break;
      case RiskLevel.MEDIUM:
        probability = Math.min(Math.max(probability, 16), 30);
        break;
      case RiskLevel.HIGH:
        probability = Math.min(Math.max(probability, 31), 60);
        break;
      case RiskLevel.VERY_HIGH:
        probability = Math.max(probability, 61);
        break;
    }

    return probability;
  }

  private calculateMaxLoanAmount(summary: FinancialSummary, score: number): number {
    // Base loan on monthly net income
    const monthlyCapacity = summary.netAverage * 0.3; // 30% of net income for repayment
    const loanTerm = 12; // months
    let maxLoan = monthlyCapacity * loanTerm;

    // Adjust based on credit score
    const scoreMultiplier = score / 100;
    maxLoan = maxLoan * (0.5 + scoreMultiplier * 0.5); // 50% to 100% based on score

    // Round to nearest 50k and ensure minimum
    maxLoan = Math.max(100000, Math.round(maxLoan / 50000) * 50000);

    return maxLoan;
  }

  private generateCreditFactors(
    validation: ValidationResult,
    financial: FinancialSummary,
    risk: RiskAnalysis,
    businessFlow: BusinessFlowValidation,
  ): CreditFactor[] {
    const factors: CreditFactor[] = [];

    // Validation match
    factors.push({
      factor: 'Document Validation',
      value: `${validation.matchPercentage}% match rate`,
      impact: validation.matchPercentage >= 80 ? 'positive' : validation.matchPercentage >= 60 ? 'neutral' : 'negative',
      weight: 25,
    });

    // Cash flow
    factors.push({
      factor: 'Cash Flow Pattern',
      value: financial.cashFlowPattern,
      impact: financial.netAverage > 0 ? 'positive' : 'negative',
      weight: 20,
    });

    // Business consistency
    factors.push({
      factor: 'Business Consistency',
      value: `${risk.consistencyScore}% consistency score`,
      impact: risk.consistencyScore >= 90 ? 'positive' : risk.consistencyScore >= 80 ? 'neutral' : 'negative',
      weight: 15,
    });

    // Round-tripping
    factors.push({
      factor: 'Fraud Risk',
      value: `${risk.roundTripTransactions.percentage}% round-trip rate`,
      impact: risk.roundTripTransactions.percentage <= 10 ? 'positive' : risk.roundTripTransactions.percentage <= 20 ? 'neutral' : 'negative',
      weight: 15,
    });

    // Sales validation
    factors.push({
      factor: 'Sales Verification',
      value: `${businessFlow.salesReceiptsMatch.percentage}% receipts matched`,
      impact: businessFlow.salesReceiptsMatch.percentage >= 85 ? 'positive' : businessFlow.salesReceiptsMatch.percentage >= 70 ? 'neutral' : 'negative',
      weight: 15,
    });

    // Transaction history
    factors.push({
      factor: 'Transaction History',
      value: `${financial.monthsAnalyzed} months analyzed`,
      impact: financial.monthsAnalyzed >= 12 ? 'positive' : 'neutral',
      weight: 10,
    });

    return factors;
  }

  private calculateRoundTripping(statement: BankStatementData): number {
    let roundTripCount = 0;
    const transactions = statement.transactions;

    for (let i = 0; i < transactions.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 10, transactions.length); j++) {
        const t1 = transactions[i];
        const t2 = transactions[j];

        const dateDiff = Math.abs(
          new Date(t1.date).getTime() - new Date(t2.date).getTime()
        ) / (1000 * 60 * 60 * 24);

        const amount1 = t1.credit || t1.debit;
        const amount2 = t2.credit || t2.debit;
        const amountDiff = Math.abs(amount1 - amount2) / amount1;

        if (dateDiff <= 1 && amountDiff <= 0.05 && t1.credit && t2.debit) {
          roundTripCount++;
        }
      }
    }

    return Math.round((roundTripCount / transactions.length) * 100);
  }

  private findMissingReceiptsMonths(
    receipts: SalesReceiptData[],
    records: SalesRecordData[],
  ): string[] {
    const receiptMonths = new Set(
      receipts.map(r => new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' }))
    );

    const missingMonths: string[] = [];
    records.forEach(record => {
      const expectedReceiptsInMonth = receipts.filter(r => {
        const receiptMonth = new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        return receiptMonth === record.period;
      }).length;

      if (expectedReceiptsInMonth < 5) { // Expecting at least 5 receipts per month
        missingMonths.push(record.period);
      }
    });

    return missingMonths.slice(0, 2); // Return max 2 for brevity
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}