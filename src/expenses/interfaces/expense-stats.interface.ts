/**
 * INTERFACES DE LA API UNIVERSAL
 * Estructuras de datos para consultas avanzadas y agregaciones
 */

export interface CategoryBreakdown {
  category: string;
  categoryDetails?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    gradient: string;
    isCustom: true;
  };
  total: number;
  count: number;
  percentage: number;
}

export interface MonthComparison {
  totalAmount: number;
  totalCount: number;
  change: {
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface TrendData {
  dailyTotals: Record<string, number>;
  labels: string[];
  values: number[];
}

export interface ExpenseBasic {
  id: string;
  amount: number;
  date: Date;
  note?: string;
  paymentMethod?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface UniversalExpensesResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  summary?: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    dateRange: DateRange;
  };
  
  categoryBreakdown?: CategoryBreakdown[];
  
  trends?: {
    dailyTotals: Record<string, number>;
    weeklyTotals?: Record<string, number>;
    monthlyTotals?: Record<string, number>;
  };
  
  raw?: {
    totalQueries: number;
    executionTime: number;
    filters: any;
  };
}

export interface UniversalStatsResponse {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  dateRange: DateRange;
  totalAmount: number;
  totalCount: number;
  average: number;
  
  // ===== OPTIONAL EXPANSIONS (include parameter) =====
  
  // Only if include="comparison"
  comparison?: {
    previousPeriod: MonthComparison | null;
    yearOverYear?: MonthComparison | null;
  };
  
  dailyTrends?: {
    labels: string[];
    values: number[];
  };
  
  trends?: {
    data: TrendData;
    seasonality?: any;
    growth: {
      rate: number;
      direction: 'up' | 'down' | 'stable';
    };
    weekOverWeek?: {
      change: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
  };
  
  breakdown?: {
    byCategory: CategoryBreakdown[];
    byPaymentMethod?: CategoryBreakdown[];
    byTimeframe?: any[];
  };
  
  forecast?: {
    projectedTotal: number;
    projectedOverrun?: number;
    daysElapsed: number;
    totalDays: number;
    confidence: 'high' | 'medium' | 'low';
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  detailed?: {
    topExpenses: ExpenseBasic[];
    categoryExpenses: Record<string, ExpenseBasic[]>;
    outliers: ExpenseBasic[];
  };
}

export interface ExpenseAggregation {
  totalAmount: number;
  totalCount: number;
  categoryTotals: Map<string, { total: number; count: number }>;
}