import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ContributeSavingsDto {
  @ApiProperty({
    example: 100,
    description: 'Cantidad a añadir a la meta de ahorro',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
