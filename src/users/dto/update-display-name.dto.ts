import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateDisplayNameDto {
  @ApiProperty({ example: 'Nuevo Nombre', description: 'Nombre público del usuario' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName: string;
}
