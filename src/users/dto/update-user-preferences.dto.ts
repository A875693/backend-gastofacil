import { IsOptional, IsBoolean, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCurrencyDto {
  @ApiProperty({ 
    description: 'Código de moneda preferida',
    example: 'EUR',
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'INR', 'BRL', 'ZAR', 'RUB', 'TRY']
  })
  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'INR', 'BRL', 'ZAR', 'RUB', 'TRY'])
  preferredCurrency?: string;

  @ApiProperty({ 
    description: 'Mostrar cantidades originales junto a las convertidas',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  showOriginalAmounts?: boolean;
}

export class UpdateNotificationsDto {
  @ApiProperty({ description: 'Activar notificaciones por email', example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ description: 'Activar notificaciones push', example: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}

export class UpdateUIPreferencesDto {
  @ApiProperty({ 
    description: 'Tema de la aplicación',
    example: 'light',
    enum: ['light', 'dark', 'auto']
  })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'auto'])
  theme?: string;

  @ApiProperty({ 
    description: 'Idioma de la aplicación (ISO 639-1)',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ca']
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ca'])
  language?: string;

  @ApiProperty({ 
    description: 'Porcentaje de ahorro objetivo',
    example: 20,
    minimum: 5,
    maximum: 80,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(80)
  savingsPercentage?: number;
}

export class UpdateUserPreferencesDto {
  @ApiProperty({ description: 'Preferencias de moneda', type: UpdateCurrencyDto })
  @IsOptional()
  currency?: UpdateCurrencyDto;

  @ApiProperty({ description: 'Preferencias de notificaciones', type: UpdateNotificationsDto })
  @IsOptional()
  notifications?: UpdateNotificationsDto;

  @ApiProperty({ description: 'Preferencias de interfaz', type: UpdateUIPreferencesDto })
  @IsOptional()
  ui?: UpdateUIPreferencesDto;

  @ApiProperty({ 
    description: 'Método de pago preferido',
    example: 'CARD',
    enum: ['CARD', 'CASH', 'TRANSFER', 'BIZUM', 'PAYPAL'],
    required: false
  })
  @IsOptional()
  @IsString()
  @IsIn(['CARD', 'CASH', 'TRANSFER', 'BIZUM', 'PAYPAL'])
  preferredPaymentMethod?: string;

  // Soporte directo para campos planos (retrocompatibilidad)
  @ApiProperty({ description: 'Activar notificaciones por email', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ description: 'Activar notificaciones push', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}