import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UniversalStatsQueryDto } from '../dto/expenses-filter-query.dto';
import { 
  UniversalStatsResponse,
  DateRange,
  ExpenseBasic
} from '../interfaces/expense-stats.interface';
import { ExpensesAggregationService } from './expenses-aggregation.service';

@Injectable()
export class ExpensesStatsService {
  private readonly collection = admin.firestore().collection('expenses');

  constructor(
    private readonly aggregationService: ExpensesAggregationService
  ) {}

  /**
   * Método universal para estadísticas - Máxima flexibilidad
   */
  async getUniversalStats(userId: string, query: UniversalStatsQueryDto): Promise<UniversalStatsResponse> {
    const period = query.period || 'monthly';
    const dateRange = this.calculateDateRange(period, query);
    
    let firestoreQuery = this.collection
      .where('userId', '==', userId)
      .where('date', '>=', dateRange.from)
      .where('date', '<=', dateRange.to);

    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category);
    }

    if (query.paymentMethod) {
      firestoreQuery = firestoreQuery.where('paymentMethod', '==', query.paymentMethod);
    }

    const snapshot = await firestoreQuery.get();
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Calcular estadísticas en una sola pasada
    const stats = expenses.reduce(
      (acc, expense) => {
        const amount = expense.amount || 0;
        acc.totalAmount += amount;
        acc.count += 1;
        return acc;
      },
      { totalAmount: 0, count: 0 }
    );

    const average = stats.count > 0 ? stats.totalAmount / stats.count : 0;

    // ===== RESPUESTA BASE =====
    const response: UniversalStatsResponse = {
      period: period as any,
      dateRange,
      totalAmount: Math.round(stats.totalAmount * 100) / 100,
      totalCount: stats.count,
      average: Math.round(average * 100) / 100
    };

    // ===== EXPANSIONES OPCIONALES =====
    const includeParams = query.include ? query.include.split(',').map(p => p.trim()) : [];

    if (includeParams.includes('breakdown')) {
      response.breakdown = {
        byCategory: await this.aggregationService.calculateCategoryBreakdown(expenses as any[], userId)
      };
    }

    if (includeParams.includes('comparison')) {
      response.comparison = await this.calculateComparison(userId, period, query, stats);
    }

    if (includeParams.includes('dailyTrends')) {
      response.dailyTrends = this.calculateDailyTrends(expenses, dateRange);
    }

    if (includeParams.includes('trends')) {
      response.trends = this.calculateTrends(expenses, dateRange);
    }

    if (includeParams.includes('forecast')) {
      response.forecast = this.calculateForecast(expenses, dateRange, stats.totalAmount);
    }

    return response;
  }

  /**
   * Calculate comparison with previous period (optimized for monthly only)
   */
  private async calculateComparison(userId: string, period: string, query: UniversalStatsQueryDto, currentStats: { totalAmount: number; count: number }) {
    // Only support monthly comparison (most common case)
    if (period !== 'monthly') return { previousPeriod: null };

    const year = query.year || new Date().getFullYear();
    const month = query.month || (new Date().getMonth() + 1);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    // Get previous month stats in one efficient query
    const prevSnapshot = await this.collection
      .where('userId', '==', userId)
      .where('date', '>=', new Date(prevYear, prevMonth - 1, 1))
      .where('date', '<=', new Date(prevYear, prevMonth, 0, 23, 59, 59))
      .get();

    const prevStats = prevSnapshot.docs.reduce((acc, doc) => {
      const amount = doc.data().amount || 0;
      return { totalAmount: acc.totalAmount + amount, totalCount: acc.totalCount + 1 };
    }, { totalAmount: 0, totalCount: 0 });

    // Calculate changes (from financial health perspective)
    const changeAmount = currentStats.totalAmount - prevStats.totalAmount;
    const changePercentage = prevStats.totalAmount === 0 
      ? (currentStats.totalAmount > 0 ? -100 : 0) // Spending when you didn't before = worse
      : (changeAmount / prevStats.totalAmount) * 100;
    
    // Financial health perspective: spending less = improvement (up), spending more = worse (down)
    const trend: 'up' | 'down' | 'stable' = Math.abs(changePercentage) < 1 ? 'stable' 
      : changeAmount < 0 ? 'up'    // Spent less = financial improvement
      : 'down'; // Spent more = financial decline

    return {
      previousPeriod: {
        totalAmount: Math.round(prevStats.totalAmount * 100) / 100,
        totalCount: prevStats.totalCount,
        change: {
          amount: Math.round(changeAmount * 100) / 100, // Positive = spent more, Negative = spent less
          percentage: Math.round(Math.abs(changePercentage) * 10) / 10, // Always positive - magnitude of change
          trend // up = financial improvement (spent less), down = financial decline (spent more)
        }
      }
    };
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(period: string, query: UniversalStatsQueryDto): DateRange {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { from: startOfWeek, to: endOfWeek };
      
      case 'monthly':
        const year = query.year || now.getFullYear();
        const month = query.month || (now.getMonth() + 1);
        return {
          from: new Date(year, month - 1, 1),
          to: new Date(year, month, 0, 23, 59, 59)
        };
      
      case 'yearly':
        const yearlyYear = query.year || now.getFullYear();
        return {
          from: new Date(yearlyYear, 0, 1),
          to: new Date(yearlyYear, 11, 31, 23, 59, 59)
        };
      
      case 'custom':
        if (!query.dateFrom || !query.dateTo) {
          throw new Error('dateFrom and dateTo are required for custom period');
        }
        return {
          from: new Date(query.dateFrom),
          to: new Date(query.dateTo)
        };
      
      default:
        throw new Error(`Unsupported period: ${period}`);
    }
  }

  /**
   * Parse expense date handling different formats (Date, string, Firestore Timestamp)
   */
  private parseExpenseDate(date: any): Date | null {
    if (!date) return null;
    
    if (date instanceof Date) {
      return date;
    }
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    // Firestore Timestamp
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000);
    }
    
    // Firestore Timestamp con toDate()
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    
    return null;
  }

  /**
   * Calculate daily trends - Agregación diaria de gastos
   * Solo incluye días con gastos > 0, ordenados cronológicamente
   */
  private calculateDailyTrends(expenses: any[], dateRange: DateRange): { labels: string[]; values: number[] } {
    const dailyTotals: Record<string, number> = {};
    
    expenses.forEach((expense: any) => {
      const date = this.parseExpenseDate(expense.date);
      if (!date) return;
      
      const dayOfMonth = date.getDate();
      const dayKey = dayOfMonth.toString();
      
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + (expense.amount || 0);
    });

    // Convertir a arrays ordenados, solo días con gastos > 0
    const sortedEntries = Object.entries(dailyTotals)
      .filter(([_, value]) => value > 0)
      .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB));

    return {
      labels: sortedEntries.map(([day]) => day),
      values: sortedEntries.map(([_, total]) => Math.round(total * 100) / 100)
    };
  }

  /**
   * Calculate trends - Análisis de patrones de gasto
   */
  private calculateTrends(expenses: any[], dateRange: DateRange): any {
    const dailyTotals: Record<string, number> = {};
    
    expenses.forEach((expense: any) => {
      const date = this.parseExpenseDate(expense.date);
      if (!date) return;
      
      const dayKey = date.toISOString().split('T')[0];
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + (expense.amount || 0);
    });

    // Calcular totales por semana del mes
    const weeklyTotals: number[] = [0, 0, 0, 0, 0]; // Hasta 5 semanas
    
    expenses.forEach((expense: any) => {
      const date = this.parseExpenseDate(expense.date);
      if (!date) return;
      
      const dayOfMonth = date.getDate();
      const weekIndex = Math.floor((dayOfMonth - 1) / 7);
      weeklyTotals[weekIndex] = (weeklyTotals[weekIndex] || 0) + (expense.amount || 0);
    });

    // Filtrar semanas con datos
    const validWeeks = weeklyTotals.filter(total => total > 0);
    
    // Calcular tendencia semana sobre semana
    let weekOverWeekTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let weekOverWeekChange = 0;
    
    if (validWeeks.length >= 2) {
      const lastWeek = validWeeks[validWeeks.length - 1];
      const prevWeek = validWeeks[validWeeks.length - 2];
      weekOverWeekChange = ((lastWeek - prevWeek) / prevWeek) * 100;
      
      if (Math.abs(weekOverWeekChange) < 5) {
        weekOverWeekTrend = 'stable';
      } else if (weekOverWeekChange > 0) {
        weekOverWeekTrend = 'increasing';
      } else {
        weekOverWeekTrend = 'decreasing';
      }
    }

    return {
      data: {
        dailyTotals,
        labels: Object.keys(dailyTotals).sort(),
        values: Object.keys(dailyTotals).sort().map(key => Math.round(dailyTotals[key] * 100) / 100)
      },
      growth: {
        rate: Math.abs(weekOverWeekChange),
        direction: weekOverWeekChange > 5 ? 'down' : weekOverWeekChange < -5 ? 'up' : 'stable'
      },
      weekOverWeek: {
        change: Math.round(weekOverWeekChange * 10) / 10,
        trend: weekOverWeekTrend
      }
    };
  }

  /**
   * Calculate forecast - Proyección de gasto total para fin de mes
   */
  private calculateForecast(expenses: any[], dateRange: DateRange, totalAmount: number): any {
    const now = new Date();
    const monthStart = new Date(dateRange.from);
    const monthEnd = new Date(dateRange.to);
    
    // Calcular días transcurridos y totales
    const totalDays = monthEnd.getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = totalDays - daysElapsed;
    
    // Proyección lineal basada en ritmo actual
    const dailyAverage = daysElapsed > 0 ? totalAmount / daysElapsed : 0;
    const projectedTotal = dailyAverage * totalDays;
    
    // Calcular confianza basada en cantidad de datos
    let confidence: 'high' | 'medium' | 'low';
    if (daysElapsed > 20) {
      confidence = 'high';
    } else if (daysElapsed >= 10) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    // Determinar tendencia
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (expenses.length >= 7) {
      // Comparar primera y segunda mitad del período
      const midpoint = Math.floor(expenses.length / 2);
      const sortedExpenses = [...expenses].sort((a, b) => {
        const dateA = this.parseExpenseDate(a.date);
        const dateB = this.parseExpenseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      
      const firstHalf = sortedExpenses.slice(0, midpoint);
      const secondHalf = sortedExpenses.slice(midpoint);
      
      const firstHalfTotal = firstHalf.reduce((sum, e) => sum + (e.amount || 0), 0);
      const secondHalfTotal = secondHalf.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const firstHalfAvg = firstHalfTotal / firstHalf.length;
      const secondHalfAvg = secondHalfTotal / secondHalf.length;
      
      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      if (changePercent > 10) {
        trend = 'increasing';
      } else if (changePercent < -10) {
        trend = 'decreasing';
      }
    }
    
    return {
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      daysElapsed,
      totalDays,
      confidence,
      trend
    };
  }
}