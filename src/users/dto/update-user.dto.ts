import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Moneda preferida del usuario, ej: EUR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
