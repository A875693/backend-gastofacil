import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomCategoryDto {
  @ApiProperty({ 
    description: 'Nombre de la categoría personalizada',
    example: 'Gimnasio',
    minLength: 1,
    maxLength: 30
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 30, { message: 'El nombre debe tener entre 1 y 30 caracteres' })
  name: string;

  @ApiProperty({ 
    description: 'Icono de Ionicons',
    example: 'fitness-outline'
  })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ 
    description: 'Color hexadecimal',
    example: '#10b981',
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { 
    message: 'El color debe ser un hexadecimal válido (ej: #FF6B6B)' 
  })
  color: string;
}
