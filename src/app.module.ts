import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FirebaseModule } from './firebase/firebase.module';
import { BudgetsModule } from './budgets/budgets.module';
import { MigrationModule } from './migration/migration.module';
import { CurrencyModule } from './currency/currency.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    AuthModule,
    UsersModule,
    ExpensesModule,
    BudgetsModule,
    MigrationModule,
    CurrencyModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
