import { Injectable } from '@nestjs/common';
import { BudgetPeriod, PeriodInfo } from './interfaces/budget.interface';

@Injectable()
export class PeriodCalculatorService {
  /**
   * Calcula información del período actual (semanal o mensual)
   */
  getCurrentPeriodInfo(budgetPeriod: BudgetPeriod): PeriodInfo {
    const now = new Date();
    
    if (budgetPeriod === BudgetPeriod.WEEKLY) {
      return this.getWeeklyPeriodInfo(now);
    } else {
      return this.getMonthlyPeriodInfo(now);
    }
  }

  /**
   * Período semanal: Lunes a Domingo
   */
  private getWeeklyPeriodInfo(now: Date): PeriodInfo {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + mondayOffset);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const daysRemaining = Math.max(1, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return {
      startDate,
      endDate,
      daysRemaining,
      totalDays: 7,
    };
  }

  /**
   * Período mensual: del día 1 al último día del mes
   */
  private getMonthlyPeriodInfo(now: Date): PeriodInfo {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Días restantes incluyendo hoy: del 27 al 31 = 5 días
    const daysRemaining = Math.max(1, endDate.getDate() - now.getDate() + 1);
    const totalDays = endDate.getDate();
    
    return {
      startDate,
      endDate,
      daysRemaining,
      totalDays,
    };
  }

  /**
   * Verifica si una fecha está dentro del período actual
   */
  isDateInCurrentPeriod(date: Date, budgetPeriod: BudgetPeriod): boolean {
    const periodInfo = this.getCurrentPeriodInfo(budgetPeriod);
    return date >= periodInfo.startDate && date <= periodInfo.endDate;
  }
}
