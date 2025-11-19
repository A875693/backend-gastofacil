import { Module } from '@nestjs/common';
import { CurrencyController } from './currency.controller';
import { ExchangeRateService } from './exchange-rate.service';
import { CurrencyConversionService } from './currency-conversion.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [CurrencyController],
  providers: [ExchangeRateService, CurrencyConversionService],
  exports: [ExchangeRateService, CurrencyConversionService]
})
export class CurrencyModule {}