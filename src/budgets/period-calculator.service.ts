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
   * Calcula información de un período específico (año/mes proporcionados)
   */
  getSpecificPeriodInfo(budgetPeriod: BudgetPeriod, year?: number, month?: number): PeriodInfo {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    if (budgetPeriod === BudgetPeriod.WEEKLY) {
      const referenceDate = new Date(targetYear, targetMonth - 1, 1);
      return this.getWeeklyPeriodInfo(referenceDate);
    } else {
      return this.getMonthlyPeriodInfoForSpecificMonth(targetYear, targetMonth);
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
   * Período mensual para un año/mes específico
   */
  private getMonthlyPeriodInfoForSpecificMonth(year: number, month: number): PeriodInfo {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const now = new Date();
    const totalDays = endDate.getDate();
    
    let daysRemaining: number;
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      daysRemaining = Math.max(1, endDate.getDate() - now.getDate() + 1);
    } else {
      daysRemaining = totalDays;
    }
    
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

  /**
   * Verifica si una fecha está dentro de un período específico
   */
  isDateInSpecificPeriod(date: Date, budgetPeriod: BudgetPeriod, year: number, month: number): boolean {
    const periodInfo = this.getSpecificPeriodInfo(budgetPeriod, year, month);
    return date >= periodInfo.startDate && date <= periodInfo.endDate;
  }
}
