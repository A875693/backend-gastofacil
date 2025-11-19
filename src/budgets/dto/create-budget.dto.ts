import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { BudgetPeriod } from '../interfaces/budget.interface';

export class CreateBudgetDto {
  @ApiProperty({
    example: 1000,
    description: 'Cantidad máxima del presupuesto',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
    description: 'Período del presupuesto',
  })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiPropertyOptional({
    example: 'Comida',
    description: 'Categoría específica (opcional, null para presupuesto general)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 80,
    description: 'Porcentaje para alertas (0-100)',
    default: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  alertThreshold?: number;
}
