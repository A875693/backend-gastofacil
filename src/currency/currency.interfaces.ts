// Shared interfaces for currency module
export interface ExchangeRateResponse {
  rate: number;
  timestamp: Date;
  source: 'cache' | 'api' | 'fallback';
}

export interface MonthlyExpensesSummary {
  hasExpenses: boolean;
  totalAmount: number;
  totalCount: number;
  currency: string;
  month: number;
  year: number;
}

export interface ConversionResult {
  success: boolean;
  convertedCount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: Date;
  errors?: string[];
}

export interface ConvertCurrencyDto {
  newCurrency?: string;
  preferredCurrency?: string; // Soporte para ambos nombres de campo
}

export interface ExchangeRateQuery {
  from: string;
  to: string;
}