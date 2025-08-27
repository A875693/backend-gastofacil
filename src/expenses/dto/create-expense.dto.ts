import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 25.5, description: 'Cantidad gastada' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Supermercado', description: 'Categoría del gasto' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({
    example: 'Compra semanal de comida',
    description: 'Nota opcional sobre el gasto',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    example: '2025-08-18T12:30:00Z',
    description: 'Fecha del gasto en formato ISO 8601',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Efectivo', description: 'Método de pago' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: ['alimentación', 'supermercado'],
    description: 'Etiquetas del gasto',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
