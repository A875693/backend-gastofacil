import { IsOptional, IsString, IsBoolean, IsNumber, IsIn, ValidateNested, IsISO4217CurrencyCode, Min, Max, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCurrencyPreferencesDto {
  @ApiPropertyOptional({ 
    example: 'USD', 
    description: 'Moneda base preferida del usuario',
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']
  })
  @IsOptional()
  @IsString()
  @IsISO4217CurrencyCode()
  preferredCurrency?: string;

  @ApiPropertyOptional({ 
    example: 'EUR', 
    description: 'Moneda para mostrar en la interfaz (puede ser diferente de la base)' 
  })
  @IsOptional()
  @IsString()
  @IsISO4217CurrencyCode()
  displayCurrency?: string;

  @ApiPropertyOptional({ 
    example: 'symbol', 
    description: 'Cómo mostrar la moneda en la interfaz',
    enum: ['symbol', 'code', 'both']
  })
  @IsOptional()
  @IsIn(['symbol', 'code', 'both'])
  currencyDisplayFormat?: 'symbol' | 'code' | 'both';

  @ApiPropertyOptional({ 
    example: 2, 
    description: 'Número de decimales a mostrar',
    minimum: 0,
    maximum: 4
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  decimalPlaces?: number;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Convertir monedas automáticamente o preguntar al usuario' 
  })
  @IsOptional()
  @IsBoolean()
  autoConversion?: boolean;

  @ApiPropertyOptional({ 
    example: 'ecb', 
    description: 'Proveedor preferido de tasas de cambio',
    enum: ['ecb', 'xe', 'currencyapi', 'fixer']
  })
  @IsOptional()
  @IsIn(['ecb', 'xe', 'currencyapi', 'fixer'])
  exchangeRateProvider?: 'ecb' | 'xe' | 'currencyapi' | 'fixer';
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ 
    example: true, 
    description: 'Activar notificaciones para nuevos gastos' 
  })
  @IsOptional()
  @IsBoolean()
  newExpense?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Activar alertas de presupuesto' 
  })
  @IsOptional()
  @IsBoolean()
  budgetAlerts?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Activar notificaciones de cambios en tasas de cambio' 
  })
  @IsOptional()
  @IsBoolean()
  currencyRateChanges?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Activar informes semanales' 
  })
  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Activar informes mensuales' 
  })
  @IsOptional()
  @IsBoolean()
  monthlyReports?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Activar notificaciones de patrones de gasto inusuales' 
  })
  @IsOptional()
  @IsBoolean()
  unusualSpending?: boolean;
}

export class UpdateUIPreferencesDto {
  @ApiPropertyOptional({ 
    example: 'dark', 
    description: 'Tema de la interfaz',
    enum: ['light', 'dark', 'auto']
  })
  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  theme?: 'light' | 'dark' | 'auto';

  @ApiPropertyOptional({ 
    example: 'en', 
    description: 'Idioma preferido (código ISO 639-1)' 
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ 
    example: 'MM/DD/YYYY', 
    description: 'Formato de fecha preferido',
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
  })
  @IsOptional()
  @IsIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Primer día de la semana (0=Domingo, 1=Lunes, 6=Sábado)',
    minimum: 0,
    maximum: 6
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  firstDayOfWeek?: 0 | 1 | 6;
}

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ type: UpdateCurrencyPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCurrencyPreferencesDto)
  currency?: UpdateCurrencyPreferencesDto;

  @ApiPropertyOptional({ type: UpdateNotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  notifications?: UpdateNotificationPreferencesDto;

  @ApiPropertyOptional({ type: UpdateUIPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUIPreferencesDto)
  ui?: UpdateUIPreferencesDto;
}