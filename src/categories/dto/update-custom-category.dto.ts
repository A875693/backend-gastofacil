import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomCategoryDto {
  @ApiPropertyOptional({ 
    description: 'Nombre de la categoría personalizada',
    example: 'Gimnasio Premium',
    minLength: 1,
    maxLength: 30
  })
  @IsString()
  @IsOptional()
  @Length(1, 30, { message: 'El nombre debe tener entre 1 y 30 caracteres' })
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Icono de Ionicons',
    example: 'barbell-outline'
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ 
    description: 'Color hexadecimal',
    example: '#059669',
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { 
    message: 'El color debe ser un hexadecimal válido (ej: #FF6B6B)' 
  })
  color?: string;
}
