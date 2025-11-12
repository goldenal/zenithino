import { Logger } from '@nestjs/common';

export interface IOcrAdapter {
  recognize(imagePath: string, languages: string[], config?: any, logger?: Logger): Promise<{ text: string; confidence: number | null }>;
}
