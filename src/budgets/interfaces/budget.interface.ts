export enum BudgetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface Budget {
  id?: string;
  userId: string;
  amount: number;
  period: BudgetPeriod;
  category?: string; // null para presupuesto general
  alertThreshold: number; // porcentaje para alertas
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SavingsGoal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  isActive: boolean;
  priority: Priority;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DailyAllowance {
  dailyAllowance: number;
  budgetPeriod: BudgetPeriod;
  totalBudget: number;
  spentThisPeriod: number;
  remainingBudget: number;
  daysLeftInPeriod: number;
  isOnTrack: boolean;
  projectedOverspend: number;
  recommendations: string[];
}

export interface PeriodInfo {
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  totalDays: number;
}
