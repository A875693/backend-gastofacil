import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { PeriodCalculatorService } from './period-calculator.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ExpensesModule, AuthModule, UsersModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, PeriodCalculatorService],
  exports: [BudgetsService, PeriodCalculatorService],
})
export class BudgetsModule {}
