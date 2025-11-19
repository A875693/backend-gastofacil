import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ExchangeRateService } from './exchange-rate.service';
import { UserPreferencesService } from '../users/services/user-preferences.service';

interface ConversionResult {
  success: boolean;
  convertedCount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: Date;
  errors?: string[];
}

interface MonthlyExpensesSummary {
  hasExpenses: boolean;
  totalAmount: number;
  totalCount: number;
  currency: string;
  month: number;
  year: number;
}

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private readonly expensesCollection = admin.firestore().collection('expenses');
  private readonly budgetsCollection = admin.firestore().collection('budgets');

  constructor(
    private readonly exchangeRateService: ExchangeRateService,
    private readonly userPreferencesService: UserPreferencesService
  ) {}

  /**
   * Obtiene un resumen de los gastos del mes actual del usuario
   * Utiliza la misma lógica que el servicio de estadísticas para consistencia
   */
  async getCurrentMonthExpensesSummary(userId: string, year?: number, month?: number): Promise<MonthlyExpensesSummary> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    this.logger.log(`=== CURRENCY SUMMARY (STATS LOGIC) ===`);
    this.logger.log(`User: ${userId}, Year: ${targetYear}, Month: ${targetMonth}`);
    
    const dateRange = {
      from: new Date(targetYear, targetMonth - 1, 1),
      to: new Date(targetYear, targetMonth, 0, 23, 59, 59)
    };
    
    this.logger.log(`Date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);

    // EXACT same Firestore query as stats service
    const firestoreQuery = this.expensesCollection
      .where('userId', '==', userId)
      .where('date', '>=', dateRange.from)
      .where('date', '<=', dateRange.to);

    const snapshot = await firestoreQuery.get();
    this.logger.log(`Firestore query returned ${snapshot.size} documents`);

    if (snapshot.empty) {
      this.logger.log(`No expenses found - returning hasExpenses: false`);
      return {
        hasExpenses: false,
        totalAmount: 0,
        totalCount: 0,
        currency: '',
        month: targetMonth,
        year: targetYear
      };
    }

    // EXACT same calculation logic as stats service
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const stats = expenses.reduce(
      (acc, expense: any) => {
        const amount = expense.amount || 0;
        acc.totalAmount += amount;
        acc.count += 1;
        this.logger.log(`Processing expense: ${amount} ${expense.currency} on ${expense.date}`);
        return acc;
      },
      { totalAmount: 0, count: 0 }
    );

    // Get currency from first expense (same as before)
    let currency = '';
    if (expenses.length > 0) {
      currency = (expenses[0] as any).currency || '';
    }

    const result = {
      hasExpenses: stats.count > 0, // This should NEVER be false if we got here
      totalAmount: Math.round(stats.totalAmount * 100) / 100, // EXACT same rounding as stats
      totalCount: stats.count,
      currency,
      month: targetMonth,
      year: targetYear
    };

    this.logger.log(`Final result:`, result);
    return result;
  }

  /**
   * Calculate date range for month (EXACT copy from expenses-stats.service.ts)
   */
  private calculateDateRangeForMonth(year: number, month: number): { from: Date; to: Date } {
    return {
      from: new Date(year, month - 1, 1),
      to: new Date(year, month, 0, 23, 59, 59)
    };
  }

  /**
   * Convierte los gastos del mes actual a una nueva moneda
   * Operación atómica que preserva los valores originales en la primera conversión
   * 
   * @param userId - ID del usuario
   * @param fromCurrency - Moneda actual de los gastos
   * @param toCurrency - Moneda destino
   * @returns Resultado de la conversión con contador de gastos convertidos
   */
  async convertCurrentMonthExpenses(
    userId: string, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('From and to currencies cannot be the same');
    }

    const startTime = new Date();
    this.logger.log(`Starting currency conversion for user ${userId}: ${fromCurrency} → ${toCurrency}`);

    try {
      const exchangeRateData = await this.exchangeRateService.getExchangeRate(fromCurrency, toCurrency);
      const exchangeRate = exchangeRateData.rate;
      
      this.logger.log(`Exchange rate ${fromCurrency}→${toCurrency}: ${exchangeRate} (source: ${exchangeRateData.source})`);

      const expensesToConvert = await this.getCurrentMonthExpensesForConversion(userId, fromCurrency);
      
      if (expensesToConvert.length === 0) {
        return {
          success: true,
          convertedCount: 0,
          fromCurrency,
          toCurrency,
          exchangeRate,
          timestamp: startTime
        };
      }

      const result = await admin.firestore().runTransaction(async (transaction) => {
        const conversionTimestamp = new Date();
        let convertedCount = 0;
        const errors: string[] = [];

        for (const expenseDoc of expensesToConvert) {
          try {
            const expense = expenseDoc.data();
            const originalAmount = expense.amount;
            const convertedAmount = Math.round(originalAmount * exchangeRate * 100) / 100;

            const updateData: any = {
              amount: convertedAmount,
              currency: toCurrency,
              updatedAt: conversionTimestamp
            };

            if (!expense.originalAmount) {
              updateData.originalAmount = originalAmount;
              updateData.originalCurrency = fromCurrency;
              updateData.exchangeRate = exchangeRate;
              updateData.conversionTimestamp = conversionTimestamp;
            } else {
              updateData.exchangeRate = exchangeRate;
              updateData.conversionTimestamp = conversionTimestamp;
            }

            transaction.update(expenseDoc.ref, updateData);
            convertedCount++;

          } catch (error) {
            errors.push(`Error converting expense ${expenseDoc.id}: ${error.message}`);
            this.logger.error(`Failed to convert expense ${expenseDoc.id}:`, error);
          }
        }

        return { convertedCount, errors };
      });

      await this.resetUserBudget(userId, toCurrency);

      await this.logConversionAudit(userId, {
        fromCurrency,
        toCurrency,
        exchangeRate,
        convertedCount: result.convertedCount,
        timestamp: startTime,
        source: exchangeRateData.source
      });

      const duration = Date.now() - startTime.getTime();
      this.logger.log(`Currency conversion completed in ${duration}ms. Converted ${result.convertedCount} expenses.`);

      return {
        success: true,
        convertedCount: result.convertedCount,
        fromCurrency,
        toCurrency,
        exchangeRate,
        timestamp: startTime,
        errors: result.errors.length > 0 ? result.errors : undefined
      };

    } catch (error) {
      this.logger.error(`Currency conversion failed for user ${userId}:`, error);
      
      return {
        success: false,
        convertedCount: 0,
        fromCurrency,
        toCurrency,
        exchangeRate: 0,
        timestamp: startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get current month expenses that need conversion (using same logic as main summary)
   */
  private async getCurrentMonthExpensesForConversion(userId: string, fromCurrency: string) {
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth() + 1;
    
    // Use same date calculation logic as summary method
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    this.logger.log(`Looking for expenses to convert in ${targetYear}-${targetMonth.toString().padStart(2, '0')} with currency ${fromCurrency}`);

    const snapshot = await this.expensesCollection
      .where('userId', '==', userId)
      .where('currency', '==', fromCurrency)
      .where('date', '>=', startOfMonth)
      .where('date', '<=', endOfMonth)
      .get();

    this.logger.log(`Found ${snapshot.size} expenses to convert from ${fromCurrency}`);
    return snapshot.docs;
  }

  /**
   * Reset user's current budget when currency changes
   */
  private async resetUserBudget(userId: string, newCurrency: string): Promise<void> {
    try {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const budgetQuery = await this.budgetsCollection
        .where('userId', '==', userId)
        .where('period', '==', currentPeriod)
        .get();

      if (!budgetQuery.empty) {
        // Mark current budget as requiring reconfiguration
        const batch = admin.firestore().batch();
        
        budgetQuery.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'requires_reconfiguration',
            previousCurrency: doc.data().currency,
            newCurrency: newCurrency,
            conversionNote: `Budget reset due to currency change to ${newCurrency}`,
            updatedAt: now
          });
        });

        await batch.commit();
        this.logger.log(`Reset budget for user ${userId} due to currency change to ${newCurrency}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to reset budget for user ${userId}:`, error);
      // Don't throw - budget reset failure shouldn't break currency conversion
    }
  }

  /**
   * Log conversion audit trail
   */
  private async logConversionAudit(userId: string, conversionData: any): Promise<void> {
    try {
      await admin.firestore().collection('currency_conversions').add({
        userId,
        ...conversionData,
        createdAt: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to log conversion audit for user ${userId}:`, error);
      // Don't throw - audit logging failure shouldn't break conversion
    }
  }

  /**
   * DEBUG: Get conversion history for user (for audit/transparency)
   */
  async getConversionHistory(userId: string, limit: number = 10) {
    try {
      const snapshot = await admin.firestore()
        .collection('currency_conversions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      this.logger.error(`Failed to get conversion history for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * EXACT REPLICA of stats service logic for comparison
   */
  async getStatsReplicaForMonth(userId: string, year?: number, month?: number): Promise<any> {
    const now = new Date();
    
    // EXACT same query object as stats service expects
    const query = {
      period: 'monthly',
      year: year || now.getFullYear(),
      month: month || (now.getMonth() + 1)
    };
    
    this.logger.log('=== STATS REPLICA TEST ===');
    this.logger.log(`Query object:`, query);

    // EXACT same calculateDateRange logic
    const dateRange = {
      from: new Date(query.year, query.month - 1, 1),
      to: new Date(query.year, query.month, 0, 23, 59, 59)
    };
    
    this.logger.log(`Date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);

    // EXACT same query as stats
    const firestoreQuery = this.expensesCollection
      .where('userId', '==', userId)
      .where('date', '>=', dateRange.from)
      .where('date', '<=', dateRange.to);

    const snapshot = await firestoreQuery.get();
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    this.logger.log(`Found ${snapshot.size} expenses`);

    // EXACT same calculation as stats
    const stats = expenses.reduce(
      (acc, expense: any) => {
        const amount = expense.amount || 0;
        acc.totalAmount += amount;
        acc.count += 1;
        return acc;
      },
      { totalAmount: 0, count: 0 }
    );

    const result = {
      hasExpenses: stats.count > 0,
      totalAmount: Math.round(stats.totalAmount * 100) / 100,
      totalCount: stats.count,
      currency: expenses.length > 0 ? (expenses[0] as any).currency : '',
      month: query.month,
      year: query.year,
      dateRange,
      rawExpenses: expenses
    };

    this.logger.log(`Stats replica result:`, result);
    return result;
  }
}