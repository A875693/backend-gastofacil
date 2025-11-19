export interface Expense {
  id?: string;
  userId: string;
  
  amount: number;
  currency: string;
  
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  conversionTimestamp?: Date;
  
  category: string;
  categoryDetails?: CustomCategoryDetails;
  note?: string;
  date: Date;
  paymentMethod?: string;
  tags?: string[];
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomCategoryDetails {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  isCustom: true;
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  exchangeRate: number;
  conversionDate: Date;
}

export interface ExpenseWithCurrency extends Expense {
  currencyInfo?: {
    isConverted: boolean;
    originalDisplay: string;
    convertedDisplay: string;
    conversionNote: string;
  };
}