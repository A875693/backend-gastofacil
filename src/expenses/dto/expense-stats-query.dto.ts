import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MonthlyStatsQueryDto {
  @ApiPropertyOptional({ example: 2025, description: 'Año para estadísticas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, description: 'Mes (1-12) para estadísticas' })
  @IsOptional()
  @Type(() => Number)  
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ 
    example: 'trend,categories', 
    description: 'Datos adicionales a incluir: trend, categories, comparison (separados por coma)' 
  })
  @IsOptional()
  @IsString()
  include?: string;
}

export class CategoryExpensesQueryDto {
  @ApiPropertyOptional({ example: 'food', description: 'Categoría de gasto' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 2025, description: 'Año para filtrar' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, description: 'Mes (1-12) para filtrar' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 1, description: 'Página para paginación' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Elementos por página' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    example: 'date', 
    description: 'Campo para ordenar',
    enum: ['date', 'amount', 'category']
  })
  @IsOptional()
  @IsString()
  @IsIn(['date', 'amount', 'category'])
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

export class YearlyStatsQueryDto {
  @ApiPropertyOptional({ example: 2025, description: 'Año para estadísticas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year?: number;
}