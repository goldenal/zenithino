export interface ValidationResult {
  isValid: boolean;
  matchPercentage: number;
  insights: ValidationInsight[];
  discrepancies: Discrepancy[];
  recommendations: string[];
}

export interface ValidationInsight {
  type: 'positive' | 'warning' | 'negative';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface Discrepancy {
  type: string;
  description: string;
  severity: 'critical' | 'moderate' | 'minor';
  affectedPeriod?: string;
}
