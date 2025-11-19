import { Controller, Get, Post, Put, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { CurrencyConversionService } from './currency-conversion.service';
import { ExchangeRateService } from './exchange-rate.service';
import { UserPreferencesService } from '../users/services/user-preferences.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { ConvertCurrencyDto, ExchangeRateQuery, MonthlyExpensesSummary, ExchangeRateResponse } from './currency.interfaces';

@ApiTags('Currency')
@Controller('currency')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class CurrencyController {
  private readonly logger = new Logger(CurrencyController.name);

  constructor(
    private readonly currencyConversionService: CurrencyConversionService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly userPreferencesService: UserPreferencesService
  ) {}

  @Get('current-month-summary')
  @ApiOperation({ 
    summary: 'Get current month expenses summary',
    description: 'Check if user has expenses in current month and get totals'
  })
  @ApiResponse({ status: 200, description: 'Monthly expenses summary' })
  async getCurrentMonthSummary(
    @GetUser() user: DecodedIdToken,
    @Query('year') year?: string,
    @Query('month') month?: string
  ): Promise<MonthlyExpensesSummary> {
    const targetYear = year ? parseInt(year) : undefined;
    const targetMonth = month ? parseInt(month) : undefined;
    return this.currencyConversionService.getCurrentMonthExpensesSummary(user.uid, targetYear, targetMonth);
  }

  @Get('exchange-rate')
  @ApiOperation({ 
    summary: 'Get exchange rate between currencies',
    description: 'Get current exchange rate with intelligent caching'
  })
  @ApiResponse({ status: 200, description: 'Exchange rate data' })
  async getExchangeRate(@Query() query: any): Promise<ExchangeRateResponse> {
    return this.exchangeRateService.getExchangeRate(query.from, query.to);
  }

  @Get('conversion-history')
  @ApiOperation({ 
    summary: 'Get currency conversion history',
    description: 'Get audit trail of currency conversions for transparency'
  })
  @ApiResponse({ status: 200, description: 'Conversion history' })
  async getConversionHistory(
    @GetUser() user: DecodedIdToken,
    @Query('limit') limit: string = '10'
  ): Promise<any[]> {
    return this.currencyConversionService.getConversionHistory(user.uid, parseInt(limit));
  }

  @Put('convert-preferred-currency')
  @ApiOperation({ 
    summary: 'Change user preferred currency and convert current month expenses',
    description: 'Atomically change preferred currency and convert current month expenses'
  })
  @ApiResponse({ status: 200, description: 'Currency conversion completed' })
  async convertPreferredCurrency(
    @GetUser() user: DecodedIdToken,
    @Body() convertDto: ConvertCurrencyDto
  ): Promise<any> {
    try {
      // Debug logs para diagnosticar el problema
      this.logger.debug(`Raw request body:`, JSON.stringify(convertDto));
      this.logger.debug(`convertDto.newCurrency:`, convertDto.newCurrency);
      this.logger.debug(`convertDto.preferredCurrency:`, convertDto.preferredCurrency);
      
      // Soportar ambos nombres de campo para compatibilidad
      const targetCurrency = convertDto.newCurrency || convertDto.preferredCurrency;
      
      this.logger.debug(`Target currency resolved to:`, targetCurrency);
      
      if (!targetCurrency) {
        return {
          success: false,
          message: 'Missing required field: newCurrency or preferredCurrency',
          convertedCount: 0
        };
      }

      // Get current user preferences
      const currentPreferences = await this.userPreferencesService.getUserPreferences(user.uid);
      const currentCurrency = currentPreferences.preferredCurrency || 'EUR';
      
      if (currentCurrency === targetCurrency) {
        return {
          success: true,
          message: 'Currency is already set to ' + targetCurrency,
          convertedCount: 0
        };
      }

      // Convert current month expenses
      const conversionResult = await this.currencyConversionService.convertCurrentMonthExpenses(
        user.uid,
        currentCurrency,
        targetCurrency
      );

      // Update user preferences
      if (conversionResult.success) {
        await this.userPreferencesService.updatePreferences(user.uid, {
          currency: { preferredCurrency: targetCurrency }
        });

        this.logger.log(
          `User ${user.uid} changed currency from ${currentCurrency} to ${targetCurrency}. ` +
          `Converted ${conversionResult.convertedCount} expenses.`
        );
      }

      return {
        success: conversionResult.success,
        message: conversionResult.success 
          ? `Successfully changed currency to ${targetCurrency}. Converted ${conversionResult.convertedCount} current month expenses.`
          : 'Failed to convert currency. Please try again.',
        convertedCount: conversionResult.convertedCount,
        fromCurrency: currentCurrency,
        toCurrency: targetCurrency,
        exchangeRate: conversionResult.exchangeRate,
        errors: conversionResult.errors
      };

    } catch (error) {
      this.logger.error(`Currency conversion failed for user ${user.uid}:`, error);
      
      // Detectar error específico de índice faltante en Firestore
      if (error.message && error.message.includes('The query requires an index')) {
        return {
          success: false,
          message: 'Database index missing. Please contact support to enable currency conversion.',
          convertedCount: 0,
          errors: ['FIRESTORE_INDEX_MISSING'],
          technical_details: 'Firestore composite index required for currency conversion query'
        };
      }
      
      return {
        success: false,
        message: 'Currency conversion failed: ' + error.message,
        convertedCount: 0,
        errors: [error.message]
      };
    }
  }

  @Get('cache-stats')
  @ApiOperation({ 
    summary: 'Get exchange rate cache statistics (dev only)',
    description: 'Get cache performance metrics'
  })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  async getCacheStats() {
    return this.exchangeRateService.getCacheStats();
  }

  @Post('clear-cache')
  @ApiOperation({ 
    summary: 'Clear exchange rate cache (admin only)',
    description: 'Force refresh of exchange rate cache'
  })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    this.exchangeRateService.clearCache();
    return { message: 'Exchange rate cache cleared successfully' };
  }

  @Get('debug-compare')
  @ApiOperation({ 
    summary: 'Debug: Compare currency vs stats queries (dev only)',
    description: 'Debug endpoint to compare query results'
  })
  @ApiResponse({ status: 200, description: 'Debug comparison data' })
  async debugCompare(
    @GetUser() user: DecodedIdToken,
    @Query('year') year?: string,
    @Query('month') month?: string
  ): Promise<any> {
    const targetYear = year ? parseInt(year) : undefined;
    const targetMonth = month ? parseInt(month) : undefined;
    
    // Get both results for comparison
    const currencyResult = await this.currencyConversionService.getCurrentMonthExpensesSummary(user.uid, targetYear, targetMonth);
    const statsReplicaResult = await this.currencyConversionService.getStatsReplicaForMonth(user.uid, targetYear, targetMonth);
    
    return {
      currencyService: currencyResult,
      statsReplica: statsReplicaResult,
      areEqual: JSON.stringify(currencyResult) === JSON.stringify(statsReplicaResult)
    };
  }

  @Get('test-stats-replica')
  @ApiOperation({ 
    summary: 'Test: Exact replica of stats service logic',
    description: 'Test endpoint with exact stats service logic'
  })
  @ApiResponse({ status: 200, description: 'Stats replica result' })
  async testStatsReplica(
    @GetUser() user: DecodedIdToken,
    @Query('year') year?: string,
    @Query('month') month?: string
  ): Promise<any> {
    const targetYear = year ? parseInt(year) : undefined;
    const targetMonth = month ? parseInt(month) : undefined;
    return this.currencyConversionService.getStatsReplicaForMonth(user.uid, targetYear, targetMonth);
  }
}