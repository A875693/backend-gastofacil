import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { OcrModule } from '../ocr/ocr.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ExpensesCrudService } from './services/expenses-crud.service';
import { ExpensesQueryService } from './services/expenses-query.service';
import { ExpensesStatsService } from './services/expenses-stats.service';
import { ExpensesAggregationService } from './services/expenses-aggregation.service';
import { CategoryPopulatorService } from './services/category-populator.service';
import { ExpensesQueryBuilder } from './builders/expenses-query.builder';

@Module({
  imports: [OcrModule, UsersModule, AuthModule],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    ExpensesCrudService,
    ExpensesQueryService,
    ExpensesStatsService,
    ExpensesAggregationService,
    CategoryPopulatorService,
    ExpensesQueryBuilder
  ],
  exports: [ExpensesService],
})
export class ExpensesModule {}
