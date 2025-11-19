import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';
import { IsOptional, IsNumber, IsString, IsArray, IsDateString, Min, IsPositive, IsDate, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';



export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  @ApiPropertyOptional({ 
    example: 25.50, 
    description: 'Cantidad en la moneda preferida del usuario (convertida por el frontend si es necesario)' 
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ 
    example: 'EUR', 
    description: 'Código de moneda en la que se almacena la cantidad (moneda preferida del usuario)',
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']
  })
  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'MXN', 'NZD', 'SGD', 'HKD', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR'])
  currency?: string;

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
    example: '2024-03-15T10:30:00.000Z', 
    description: 'Fecha y hora en que se realizó la conversión de moneda' 
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  conversionTimestamp?: Date;

  @ApiPropertyOptional({ example: '2024-03-15T10:30:00.000Z', description: 'Fecha del gasto en formato ISO' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'food', description: 'Categoría del gasto' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'credit_card', description: 'Método de pago utilizado' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'Almuerzo en restaurante italiano (originalmente 30.00 USD)', description: 'Nota opcional del gasto' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: ['negocios', 'comida', 'viaje'], description: 'Etiquetas opcionales del gasto' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [])
  tags?: string[];
}
