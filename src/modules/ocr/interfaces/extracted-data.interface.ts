export interface ExtractedData {
  documentType: string;
  extractedText: string;
  structuredData: {
    salesReceipts?: SalesReceiptData[];
    salesRecords?: SalesRecordData[];
    bankStatements?: BankStatementData[];
  };
}

export interface SalesReceiptData {
  receiptNumber: string;
  date: string;
  amount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  customerName?: string;
  paymentMethod: string;
}

export interface SalesRecordData {
  recordId: string;
  period: string;
  totalSales: number;
  numberOfTransactions: number;
  averageTransactionValue: number;
  topProducts: string[];
}

export interface BankStatementData {
  accountNumber: string;
  accountName: string;
  period: {
    from: string;
    to: string;
  };
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
}
