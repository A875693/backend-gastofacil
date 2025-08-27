import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '../interfaces/budget.interface';

export class DailyAllowanceDto {
  @ApiProperty({
    example: 45.5,
    description: 'Cantidad que puede gastar hoy',
  })
  dailyAllowance: number;

  @ApiProperty({
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
    description: 'Período del presupuesto',
  })
  budgetPeriod: BudgetPeriod;

  @ApiProperty({
    example: 1000,
    description: 'Presupuesto total',
  })
  totalBudget: number;

  @ApiProperty({
    example: 545,
    description: 'Gastado en este período',
  })
  spentThisPeriod: number;

  @ApiProperty({
    example: 455,
    description: 'Presupuesto restante',
  })
  remainingBudget: number;

  @ApiProperty({
    example: 10,
    description: 'Días restantes en el período',
  })
  daysLeftInPeriod: number;

  @ApiProperty({
    example: true,
    description: 'Si va por buen camino',
  })
  isOnTrack: boolean;

  @ApiProperty({
    example: 0,
    description: 'Proyección de exceso de gasto',
  })
  projectedOverspend: number;

  @ApiProperty({
    example: ['Vas por buen camino', 'Puedes gastar 45.50€ hoy'],
    description: 'Recomendaciones basadas en el estado actual',
  })
  recommendations: string[];
}
