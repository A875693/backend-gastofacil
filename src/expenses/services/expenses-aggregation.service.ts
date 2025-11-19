import { Injectable } from '@nestjs/common';
import { UniversalExpensesResponse, CategoryBreakdown } from '../interfaces/expense-stats.interface';
import { DateRange } from '../interfaces/expense-stats.interface';
import { CategoryPopulatorService } from './category-populator.service';

@Injectable()
export class ExpensesAggregationService {
  constructor(
    private readonly categoryPopulator: CategoryPopulatorService,
  ) {}
  
  /**
   * Calcula resumen de gastos
   */
  calculateSummary(expenses: any[], dateRange?: DateRange | null) {
    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    return {
      totalAmount: Math.round(total * 100) / 100,
      totalCount: expenses.length,
      averageAmount: expenses.length > 0 ? Math.round((total / expenses.length) * 100) / 100 : 0,
      dateRange: dateRange || { from: new Date(0), to: new Date() }
    };
  }

  /**
   * Calcula breakdown por categorías
   */
  async calculateCategoryBreakdown(expenses: any[], userId: string): Promise<CategoryBreakdown[]> {
    const categoryTotals = new Map<string, { total: number; count: number }>();
    
    expenses.forEach((expense: any) => {
      const category = expense.category || 'other';
      const amount = expense.amount || 0;
      const existing = categoryTotals.get(category) || { total: 0, count: 0 };
      categoryTotals.set(category, {
        total: existing.total + amount,
        count: existing.count + 1
      });
    });

    const totalAmount = expenses.reduce((sum, expense: any) => sum + (expense.amount || 0), 0);
    
    const breakdown = Array.from(categoryTotals, ([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100 * 100) / 100 : 0
    })).sort((a, b) => b.total - a.total);

    return this.populateCategoryBreakdown(breakdown, userId);
  }

  /**
   * Populate categoryDetails in breakdown items
   */
  private async populateCategoryBreakdown(
    breakdown: CategoryBreakdown[],
    userId: string,
  ): Promise<CategoryBreakdown[]> {
    const customCategories = breakdown.filter(item => !this.isBaseCategory(item.category));

    if (customCategories.length === 0) {
      return breakdown;
    }

    const tempExpenses = customCategories.map(item => ({
      category: item.category,
      amount: 0,
    }));

    const populatedTemp = await this.categoryPopulator.populateExpenses(tempExpenses as any, userId);

    const categoryDetailsMap = new Map();
    populatedTemp.forEach(expense => {
      if (expense.categoryDetails) {
        categoryDetailsMap.set(expense.category, expense.categoryDetails);
      }
    });

    return breakdown.map(item => ({
      ...item,
      categoryDetails: categoryDetailsMap.get(item.category),
    }));
  }

  /**
   * Verifica si una categoría es base (predefinida)
   */
  private isBaseCategory(categoryId: string): boolean {
    const baseCategories = [
      'food',
      'transport',
      'entertainment',
      'shopping',
      'health',
      'education',
      'bills',
      'subscriptions',
      'travel',
      'others',
    ];
    
    return baseCategories.includes(categoryId);
  }

  /**
   * Calcula tendencias diarias
   */
  calculateDailyTrends(expenses: any[]) {
    const dailyTotals: Record<string, number> = {};
    
    expenses.forEach((expense: any) => {
      const date = new Date(expense.date);
      const dayKey = date.toISOString().split('T')[0];
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + (expense.amount || 0);
    });

    Object.keys(dailyTotals).forEach(key => {
      dailyTotals[key] = Math.round(dailyTotals[key] * 100) / 100;
    });

    return { dailyTotals };
  }

  /**
   * Aplica expansiones opcionales a la respuesta
   */
  async applyExpansions(
    response: UniversalExpensesResponse,
    expenses: any[],
    includeParams: string[],
    userId: string,
    dateRange?: DateRange | null
  ): Promise<void> {
    if (includeParams.includes('summary')) {
      response.summary = this.calculateSummary(expenses, dateRange);
    }

    if (includeParams.includes('categories')) {
      response.categoryBreakdown = await this.calculateCategoryBreakdown(expenses, userId);
    }

    if (includeParams.includes('trends')) {
      response.trends = this.calculateDailyTrends(expenses);
    }
  }
}