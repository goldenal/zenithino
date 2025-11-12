import { Injectable } from '@nestjs/common';
import {
  ExtractedData,
  SalesReceiptData,
  SalesRecordData,
  BankStatementData,
} from './interfaces/extracted-data.interface';
import { DocumentType } from '../../common/enums/document-type.enum';

@Injectable()
export class OcrService {
  // Simulated OCR extraction - returns mock data based on document type
  async extractText(
    file: Express.Multer.File,
    documentType: DocumentType,
  ): Promise<ExtractedData> {
    // Simulate processing delay
    await this.delay(1000);

    switch (documentType) {
      case DocumentType.SALES_RECEIPT:
        return this.simulateSalesReceiptExtraction();
      case DocumentType.SALES_RECORD:
        return this.simulateSalesRecordExtraction();
      case DocumentType.BANK_STATEMENT:
        return this.simulateBankStatementExtraction();
      default:
        throw new Error('Unsupported document type');
    }
  }

  private simulateSalesReceiptExtraction(): ExtractedData {
    const receipts: SalesReceiptData[] = [];
    const startDate = new Date('2024-01-01');

    // Generate 12 months of receipts (10-15 receipts per month)
    for (let month = 0; month < 12; month++) {
      const receiptsInMonth = Math.floor(Math.random() * 6) + 10;
      
      for (let i = 0; i < receiptsInMonth; i++) {
        const receiptDate = new Date(startDate);
        receiptDate.setMonth(month);
        receiptDate.setDate(Math.floor(Math.random() * 28) + 1);

        receipts.push({
          receiptNumber: `RCP-${String(month + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
          date: receiptDate.toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 150000) + 10000,
          items: [
            {
              description: ['Clothing', 'Accessories', 'Shoes', 'Bags'][Math.floor(Math.random() * 4)],
              quantity: Math.floor(Math.random() * 5) + 1,
              unitPrice: Math.floor(Math.random() * 30000) + 5000,
              total: 0,
            },
          ],
          customerName: ['Customer A', 'Customer B', 'Customer C'][Math.floor(Math.random() * 3)],
          paymentMethod: ['Cash', 'Transfer', 'POS'][Math.floor(Math.random() * 3)],
        });
      }
    }

    return {
      documentType: 'SALES_RECEIPT',
      extractedText: 'Sales receipts extracted successfully',
      structuredData: {
        salesReceipts: receipts,
      },
    };
  }

  private simulateSalesRecordExtraction(): ExtractedData {
    const records: SalesRecordData[] = [];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 0; i < 12; i++) {
      const numberOfTransactions = Math.floor(Math.random() * 50) + 100;
      const totalSales = Math.floor(Math.random() * 2000000) + 500000;

      records.push({
        recordId: `REC-2024-${String(i + 1).padStart(2, '0')}`,
        period: `${months[i]} 2024`,
        totalSales,
        numberOfTransactions,
        averageTransactionValue: Math.floor(totalSales / numberOfTransactions),
        topProducts: ['Fashion Items', 'Accessories', 'Footwear'],
      });
    }

    return {
      documentType: 'SALES_RECORD',
      extractedText: 'Sales records extracted successfully',
      structuredData: {
        salesRecords: records,
      },
    };
  }

  private simulateBankStatementExtraction(): ExtractedData {
    const transactions: BankStatementData['transactions'] = [];
    const startDate = new Date('2024-01-01');
    let runningBalance = 500000;

    // Generate daily transactions for 12 months
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2024, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const transDate = new Date(2024, month, day);
        const numTransactions = Math.floor(Math.random() * 3) + 1;

        for (let t = 0; t < numTransactions; t++) {
          const isCredit = Math.random() > 0.3;
          const amount = Math.floor(Math.random() * 100000) + 5000;

          if (isCredit) {
            runningBalance += amount;
            transactions.push({
              date: transDate.toISOString().split('T')[0],
              description: ['Customer Payment', 'Sales Revenue', 'Transfer In'][Math.floor(Math.random() * 3)],
              debit: 0,
              credit: amount,
              balance: runningBalance,
            });
          } else {
            runningBalance -= amount;
            transactions.push({
              date: transDate.toISOString().split('T')[0],
              description: ['Supplier Payment', 'Rent', 'Utilities', 'Stock Purchase'][Math.floor(Math.random() * 4)],
              debit: amount,
              credit: 0,
              balance: runningBalance,
            });
          }
        }
      }
    }

    const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
    const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);

    const statement: BankStatementData = {
      accountNumber: '0123456789',
      accountName: 'ChiChi Fashion Boutique',
      period: {
        from: '2024-01-01',
        to: '2024-12-31',
      },
      openingBalance: 500000,
      closingBalance: runningBalance,
      totalCredits,
      totalDebits,
      transactions,
    };

    return {
      documentType: 'BANK_STATEMENT',
      extractedText: 'Bank statement extracted successfully',
      structuredData: {
        bankStatements: [statement],
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}