import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, IsDateString, IsPositive, IsDate, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ 
    example: 25.50, 
    description: 'Cantidad en la moneda preferida del usuario (convertida automáticamente si es necesario)' 
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

    @ApiProperty({ 
    example: 'EUR', 
    description: 'Código de moneda en la que se almacena la cantidad (moneda preferida del usuario)',
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']
  })
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR'])
  currency: string;

    @ApiPropertyOptional({ 
    example: 30.00, 
    description: 'Cantidad original en la moneda seleccionada por el usuario (si es diferente de la preferida)' 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  originalAmount?: number;

  @ApiPropertyOptional({ 
    example: 'USD', 
    description: 'Moneda original seleccionada por el usuario (si es diferente de la preferida)',
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']
  })
  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR'])
  originalCurrency?: string;

  @ApiPropertyOptional({ 
    example: 1.17, 
    description: 'Tasa de cambio utilizada para la conversión (cantidad original / tasa de cambio = cantidad en moneda preferida)' 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;

  @ApiPropertyOptional({ 
    example: '2024-01-15T10:30:00Z', 
    description: 'Fecha y hora en que se realizó la conversión de moneda' 
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  conversionTimestamp?: Date;

  @ApiProperty({ 
    example: '2024-03-15T10:30:00.000Z', 
    description: 'Fecha del gasto en formato ISO' 
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ 
    example: 'food', 
    description: 'Categoría del gasto' 
  })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ 
    example: 'credit_card', 
    description: 'Método de pago utilizado' 
  })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ 
    example: 'Almuerzo en restaurante italiano (pagado 55 USD)', 
    description: 'Nota opcional del gasto' 
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ 
    example: ['negocios', 'comida', 'viaje'], 
    description: 'Etiquetas opcionales del gasto' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  tags?: string[];
}
