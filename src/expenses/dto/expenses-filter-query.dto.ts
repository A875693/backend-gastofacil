import { IsOptional, IsString, IsNumber, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO Universal para filtros de gastos - Endpoint único optimizado
 * Reemplaza múltiples DTOs especializados con un enfoque flexible
 */
export class UniversalExpensesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página para paginación' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Elementos por página (máximo 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 2025, description: 'Filtrar por año específico' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, description: 'Filtrar por mes (1-12)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ 
    example: '2025-09-01', 
    description: 'Fecha desde (ISO format: YYYY-MM-DD)' 
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ 
    example: '2025-09-30', 
    description: 'Fecha hasta (ISO format: YYYY-MM-DD)' 
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'food', description: 'Filtrar por categoría específica' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ 
    example: 'food,transport,entertainment', 
    description: 'Múltiples categorías separadas por coma' 
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(',').map((cat: string) => cat.trim()))
  categories?: string[];

  @ApiPropertyOptional({ example: 'credit_card', description: 'Filtrar por método de pago' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 10.50, description: 'Monto mínimo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ example: 500.00, description: 'Monto máximo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ 
    example: 'lunch restaurant', 
    description: 'Búsqueda en note/descripción' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    example: 'business,personal', 
    description: 'Filtrar por tags (separados por coma)' 
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(',').map((tag: string) => tag.trim()))
  tags?: string[];

  // =====================================================
  // ORDENAMIENTO
  // =====================================================
  @ApiPropertyOptional({ 
    example: 'date', 
    description: 'Campo para ordenar',
    enum: ['date', 'amount', 'category', 'createdAt', 'updatedAt']
  })
  @IsOptional()
  @IsString()
  @IsIn(['date', 'amount', 'category', 'createdAt', 'updatedAt'])
  sortBy?: string = 'date';

  @ApiPropertyOptional({ 
    example: 'desc', 
    description: 'Dirección de ordenamiento',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({ 
    example: 'summary,categories,trends', 
    description: 'Datos adicionales: summary, categories, trends, raw (separados por coma)' 
  })
  @IsOptional()
  @IsString()
  include?: string;
}

/**
 * DTO Universal para estadísticas - Máxima flexibilidad
 */
export class UniversalStatsQueryDto {
  @ApiPropertyOptional({ 
    example: 'monthly', 
    description: 'Periodo de análisis',
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom']
  })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly', 'custom'])
  period?: string = 'monthly';
  // =====================================================
  @ApiPropertyOptional({ example: 2025, description: 'Año para análisis' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, description: 'Mes para análisis (1-12)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 38, description: 'Semana del año (1-53)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(53)
  week?: number;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Fecha desde para periodo custom' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-09-30', description: 'Fecha hasta para periodo custom' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // =====================================================
  // FILTROS DE CONTENIDO
  // =====================================================
  @ApiPropertyOptional({ example: 'food', description: 'Analizar categoría específica' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'credit_card', description: 'Analizar método de pago específico' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ 
    example: 'category', 
    description: 'Agrupar resultados por campo',
    enum: ['category', 'paymentMethod', 'day', 'month', 'year', 'week']
  })
  @IsOptional()
  @IsString()
  @IsIn(['category', 'paymentMethod', 'day', 'month', 'year', 'week'])
  groupBy?: string;

  @ApiPropertyOptional({ 
    example: 'comparison,trends,breakdown,forecast', 
    description: 'Datos adicionales: comparison, trends, breakdown, forecast, detailed (separados por coma)' 
  })
  @IsOptional()
  @IsString()
  include?: string;
}

/** @deprecated Use UniversalExpensesQueryDto instead */
export class ExpensesFilterQueryDto extends UniversalExpensesQueryDto {}

/** @deprecated Use UniversalExpensesQueryDto instead */
export class MonthlyExpensesQueryDto {
  @ApiPropertyOptional({ example: 2025, description: 'Año (requerido)' })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ example: 9, description: 'Mes (1-12, requerido)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ example: 1, description: 'Página para paginación' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Elementos por página (máximo 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    example: 'date', 
    description: 'Campo para ordenar',
    enum: ['date', 'amount', 'category', 'createdAt']
  })
  @IsOptional()
  @IsString()
  @IsIn(['date', 'amount', 'category', 'createdAt'])
  sortBy?: string = 'date';

  @ApiPropertyOptional({ 
    example: 'desc', 
    description: 'Dirección de ordenamiento',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}