import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ExtractedData } from '../ocr/interfaces/extracted-data.interface';
import { ValidationResult } from './interfaces/validation-result.interface';
import { CreditScore } from './interfaces/credit-score.interface';

@Injectable()
export class AiValidatorService {
  private genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async validateDocuments(
    salesReceipts: ExtractedData,
    salesRecords: ExtractedData,
    bankStatement: ExtractedData,
  ): Promise<ValidationResult> {
    const prompt = `
      Act as an expert credit analyst. Your task is to validate a loan applicant's financial documents.
      You will be given their sales receipts, sales records, and bank statements.
      Analyze the consistency and authenticity of these documents.

      Here is the data:
      1. Sales Receipts: ${JSON.stringify(salesReceipts)}
      2. Sales Records: ${JSON.stringify(salesRecords)}
      3. Bank Statement: ${JSON.stringify(bankStatement)}

      Based on your analysis, provide a JSON object that conforms to the following TypeScript interface: 
      
      interface ValidationResult {
        isValid: boolean; // Is the overall documentation valid and consistent?
        matchPercentage: number; // An overall consistency score from 0 to 100.
        insights: ValidationInsight[]; // Key observations (positive, negative, warning).
        discrepancies: Discrepancy[]; // Specific mismatches or red flags.
        recommendations: string[]; // Your final recommendations (e.g., "Recommend approval", "Request clarification").
      }

      interface ValidationInsight {
        type: 'positive' | 'negative' | 'warning';
        message: string;
        impact: 'high' | 'medium' | 'low';
      }

      interface Discrepancy {
        type: string; // e.g., 'Amount Mismatch', 'Missing Documentation'
        description: string;
        severity: 'critical' | 'moderate' | 'low';
        affectedPeriod?: string;
      }
      

      Your response MUST be a valid JSON object only, without any surrounding text or markdown.
    `;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: prompt,
      });
      const text = result.text;

      if (typeof text !== 'string' || text.length === 0) {
        throw new InternalServerErrorException(
          'Failed to get a valid response from AI. The response text is empty.',
        );
      }

      // Clean the response to ensure it's valid JSON
      const cleanedJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanedJson) as ValidationResult;
    } catch (error) {
      console.error('Error calling Gemini API for document validation:', error);
      throw new InternalServerErrorException(
        'Failed to validate documents with AI',
      );
    }
  }

  async calculateCreditScore(
    validationResult: ValidationResult,
    salesReceipts: ExtractedData,
    salesRecords: ExtractedData,
    bankStatement: ExtractedData,
    requestedAmount: number,
  ): Promise<CreditScore> {
    const prompt = `
      Act as a senior credit risk officer. You have already performed an initial document validation, and the result is provided below.
      Now, your task is to perform a full credit assessment and calculate a credit score.

      Here is the summary of the initial validation:
      
      ${JSON.stringify(validationResult.insights)}
      

      Here is the financial data:
      1. Sales Receipts: ${JSON.stringify(salesReceipts)}
      2. Sales Records: ${JSON.stringify(salesRecords)}
      3. Bank Statement: ${JSON.stringify(bankStatement)}
      4. Requested Loan Amount: ${requestedAmount}

      Based on all this information, provide a comprehensive credit assessment as a JSON object.
      The JSON object must conform to the following TypeScript interface: 
      
      interface CreditScore {
        score: number; // A final credit score from 0 to 100.
        riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
        defaultProbability: number; // Probability of default as a percentage (e.g., 5.5).
        maxLoanAmount: number; // The maximum loan amount you recommend. This should not exceed the requested amount.
        expectedLoss: number; // Calculated as maxLoanAmount * (defaultProbability / 100).
        lossRate: number;
        financialSummary: FinancialSummary;
        riskAnalysis: RiskAnalysis;
        businessFlowValidation: BusinessFlowValidation;
        factors: CreditFactor[]; // Key factors influencing the score.
      }

      // You must also generate the data for these nested interfaces:
      interface FinancialSummary {
        averageMonthlyInflow: number;
        averageMonthlyOutflow: number;
        netAverage: number;
        cashFlowPattern: string; // e.g., 'Consistent', 'Irregular'
        monthsAnalyzed: number;
      }

      interface RiskAnalysis {
        roundTripTransactions: {
          detected: number;
          percentage: number;
          details: string[];
        };
        consistencyScore: number; // A score from 0-100 for transaction consistency.
        fraudIndicators: string[];
      }

      interface BusinessFlowValidation {
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

      interface CreditFactor {
        factor: string;
        value: string;
        impact: 'positive' | 'negative' | 'neutral';
        weight: number; // Weight of this factor in the overall score (total should be 100).
      }
      

      Your response MUST be a valid JSON object only, without any surrounding text or markdown.
    `;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: prompt,
      });
      const text = result.text;

      if (typeof text !== 'string' || text.length === 0) {
        throw new InternalServerErrorException( //j
          'Failed to get a valid response from AI. The response text is empty.',
        );
      }

      const cleanedJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const creditScoreResult = JSON.parse(cleanedJson) as CreditScore;

      // Ensure the maxLoanAmount does not exceed the requested amount
      creditScoreResult.maxLoanAmount = Math.min(
        creditScoreResult.maxLoanAmount,
        requestedAmount,
      );

      return creditScoreResult;
    } catch (error) {
      console.error('Error calling Gemini API for credit scoring:', error);
      throw new InternalServerErrorException(
        'Failed to calculate credit score with AI',
      );
    }
  }
}
