import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UniversalExpensesQueryDto } from '../dto/expenses-filter-query.dto';

@Injectable()
export class ExpensesQueryBuilder {
  /**
   * Construye query de Firestore con filtros dinámicos
   */
  buildExpensesQuery(
    baseQuery: admin.firestore.Query,
    query: UniversalExpensesQueryDto
  ): {
    firestoreQuery: admin.firestore.Query;
    filters: Record<string, any>;
    needsPostProcessing: boolean;
  } {
    let firestoreQuery = baseQuery;
    const filters: Record<string, any> = {};

    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category);
      filters.category = query.category;
    }

    if (query.categories && query.categories.length > 0) {
      firestoreQuery = firestoreQuery.where('category', 'in', query.categories);
      filters.categories = query.categories;
    }

    if (query.paymentMethod) {
      firestoreQuery = firestoreQuery.where('paymentMethod', '==', query.paymentMethod);
      filters.paymentMethod = query.paymentMethod;
    }

    const dateRange = this.buildDateRangeFilter(query);
    if (dateRange) {
      firestoreQuery = firestoreQuery
        .where('date', '>=', dateRange.from)
        .where('date', '<=', dateRange.to);
      filters.dateRange = dateRange;
    }

    const orderBy = query.sortBy || 'date';
    const orderDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';
    firestoreQuery = firestoreQuery.orderBy(orderBy, orderDirection);

    const needsPostProcessing = this.needsPostProcessing(query);

    return {
      firestoreQuery,
      filters,
      needsPostProcessing
    };
  }

  /**
   * Construye filtro de rango de fechas
   */
  private buildDateRangeFilter(query: UniversalExpensesQueryDto): { from: Date; to: Date } | null {
    if (query.dateFrom && query.dateTo) {
      return {
        from: new Date(query.dateFrom),
        to: new Date(query.dateTo)
      };
    }

    if (query.year && query.month) {
      return {
        from: new Date(query.year, query.month - 1, 1),
        to: new Date(query.year, query.month, 0, 23, 59, 59)
      };
    }

    if (query.year) {
      return {
        from: new Date(query.year, 0, 1),
        to: new Date(query.year, 11, 31, 23, 59, 59)
      };
    }

    return null;
  }

  /**
   * Determina si la query necesita post-procesamiento
   */
  private needsPostProcessing(query: UniversalExpensesQueryDto): boolean {
    return !!(
      query.minAmount !== undefined ||
      query.maxAmount !== undefined ||
      query.search ||
      query.tags?.length
    );
  }

  /**
   * Aplica filtros de post-procesamiento
   */
  applyPostProcessingFilters(expenses: any[], query: UniversalExpensesQueryDto): any[] {
    let filteredExpenses = expenses;

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      filteredExpenses = filteredExpenses.filter((expense: any) => {
        const amount = expense.amount || 0;
        if (query.minAmount !== undefined && amount < query.minAmount) return false;
        if (query.maxAmount !== undefined && amount > query.maxAmount) return false;
        return true;
      });
    }
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredExpenses = filteredExpenses.filter((expense: any) =>
        expense.note?.toLowerCase().includes(searchTerm) ||
        expense.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por tags
    if (query.tags && query.tags.length > 0) {
      filteredExpenses = filteredExpenses.filter((expense: any) =>
        expense.tags?.some((tag: string) => query.tags!.includes(tag))
      );
    }

    return filteredExpenses;
  }
}