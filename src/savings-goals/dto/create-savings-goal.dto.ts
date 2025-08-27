import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { Priority } from '../../budgets/interfaces/budget.interface';

export class CreateSavingsGoalDto {
  @ApiProperty({
    example: 'Viaje a Japón',
    description: 'Nombre de la meta de ahorro',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 3000,
    description: 'Cantidad objetivo a ahorrar',
  })
  @IsNumber()
  @Min(0.01)
  targetAmount: number;

  @ApiProperty({
    example: 500,
    description: 'Cantidad actual ahorrada',
  })
  @IsNumber()
  @Min(0)
  currentAmount: number;

  @ApiProperty({
    example: '2025-12-31T23:59:59Z',
    description: 'Fecha objetivo para alcanzar la meta',
  })
  @IsDateString()
  targetDate: string;

  @ApiProperty({
    example: true,
    description: 'Si la meta está activa',
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    enum: Priority,
    example: Priority.HIGH,
    description: 'Prioridad de la meta',
  })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({
    example: 'Viajes',
    description: 'Categoría de la meta de ahorro',
  })
  @IsString()
  category: string;
}
