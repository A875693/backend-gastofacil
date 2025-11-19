import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UniversalExpensesQueryDto } from '../dto/expenses-filter-query.dto';
import { UniversalExpensesResponse } from '../interfaces/expense-stats.interface';
import { ExpensesQueryBuilder } from '../builders/expenses-query.builder';
import { ExpensesAggregationService } from './expenses-aggregation.service';
import { CategoryPopulatorService } from './category-populator.service';

@Injectable()
export class ExpensesQueryService {
  private readonly collection = admin.firestore().collection('expenses');

  constructor(
    private readonly queryBuilder: ExpensesQueryBuilder,
    private readonly aggregationService: ExpensesAggregationService,
    private readonly categoryPopulator: CategoryPopulatorService,
  ) {}

  /**
   * Método universal para gastos - Reemplaza todos los métodos específicos
   * Máxima flexibilidad con parámetro include para field selection
   */
  async findExpenses(userId: string, query: UniversalExpensesQueryDto): Promise<UniversalExpensesResponse> {
    const startTime = Date.now();
    const baseQuery = this.collection.where('userId', '==', userId);
    
    const { firestoreQuery, filters, needsPostProcessing } = this.queryBuilder.buildExpensesQuery(
      baseQuery,
      query
    );

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    let expenses: any[];
    let allFilteredExpenses: any[];
    let actualTotal: number;

    if (needsPostProcessing) {
      const snapshot = await firestoreQuery.get();
      const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const filteredExpenses = this.queryBuilder.applyPostProcessingFilters(allExpenses, query);
      
      actualTotal = filteredExpenses.length;
      allFilteredExpenses = filteredExpenses;
      expenses = filteredExpenses.slice(offset, offset + limit);
    } else {
      const [totalSnapshot, paginatedSnapshot] = await Promise.all([
        firestoreQuery.get(),
        firestoreQuery.offset(offset).limit(limit).get()
      ]);
      expenses = paginatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      allFilteredExpenses = totalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      actualTotal = totalSnapshot.size;
    }

    const expensesWithCategories = await this.categoryPopulator.populateExpenses(expenses, userId);
    
    const response: UniversalExpensesResponse = {
      data: expensesWithCategories,
      pagination: {
        page,
        limit,
        total: actualTotal,
        totalPages: Math.ceil(actualTotal / limit),
        hasNext: page * limit < actualTotal,
        hasPrev: page > 1
      }
    };

    const includeParams = query.include ? query.include.split(',').map(p => p.trim()) : [];
    
    await this.aggregationService.applyExpansions(
      response,
      allFilteredExpenses,
      includeParams,
      userId,
      filters.dateRange || null
    );

    if (includeParams.includes('raw')) {
      response.raw = {
        totalQueries: needsPostProcessing ? 1 : 2,
        executionTime: Date.now() - startTime,
        filters
      };
    }

    return response;
  }
}