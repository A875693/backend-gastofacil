import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { DailyAllowanceDto } from './dto/daily-allowance.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { DecodedIdToken } from 'firebase-admin/auth';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo presupuesto' })
  @ApiResponse({ status: 201, description: 'Presupuesto creado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@GetUser() user: DecodedIdToken, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.uid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los presupuestos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de presupuestos' })
  findAll(@GetUser() user: DecodedIdToken) {
    return this.budgetsService.findAll(user.uid);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener el presupuesto del usuario' })
  @ApiResponse({ status: 200, description: 'Presupuesto encontrado' })
  @ApiResponse({ status: 404, description: 'No hay presupuesto configurado' })
  findActive(@GetUser() user: DecodedIdToken) {
    return this.budgetsService.findActive(user.uid);
  }

  /**
   * Endpoint principal: Obtiene el presupuesto único del usuario
   * Retorna 404 si no existe 
   */
  @Get('user-budget')
  @ApiOperation({ summary: 'Obtener el presupuesto único del usuario' })
  @ApiResponse({ status: 200, description: 'Presupuesto encontrado' })
  @ApiResponse({ status: 404, description: 'No hay presupuesto configurado' })
  async getUserBudget(@GetUser() user: DecodedIdToken) {
    const budget = await this.budgetsService.getUserBudget(user.uid);
    if (!budget) {
      throw new NotFoundException('No tienes un presupuesto configurado. Crea uno para comenzar.');
    }
    return budget;
  }

  /**
   * Endpoint principal: Crea o actualiza el presupuesto único del usuario
   * Garantiza que solo exista un presupuesto por usuario
   */
  @Put('user-budget')
  @ApiOperation({ summary: 'Crear o actualizar el presupuesto único del usuario' })
  @ApiResponse({ status: 200, description: 'Presupuesto actualizado correctamente' })
  @ApiResponse({ status: 201, description: 'Presupuesto creado correctamente' })
  updateUserBudget(
    @GetUser() user: DecodedIdToken,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.updateUserBudget(user.uid, dto);
  }

  /**
   * Endpoint principal: Calcula el gasto diario permitido
   * Considera presupuesto, gastos del período y días restantes
   * Soporta parámetros opcionales year y month para períodos específicos
   */
  @Get('daily-allowance')
  @ApiOperation({ 
    summary: 'Calcular cuánto puede gastar hoy el usuario',
    description: 'Calcula el gasto diario permitido. Soporta parámetros opcionales year y month para períodos específicos.'
  })
  @ApiQuery({ 
    name: 'year', 
    required: false, 
    description: 'Año específico (ej: 2025)', 
    example: 2025 
  })
  @ApiQuery({ 
    name: 'month', 
    required: false, 
    description: 'Mes específico (1-12)', 
    example: 10 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cálculo de gasto diario permitido',
    type: DailyAllowanceDto 
  })
  @ApiResponse({ status: 404, description: 'No hay presupuesto configurado' })
  getDailyAllowance(
    @GetUser() user: DecodedIdToken,
    @Query('year') year?: string,
    @Query('month') month?: string
  ): Promise<DailyAllowanceDto> {
    const targetYear = year ? parseInt(year, 10) : undefined;
    const targetMonth = month ? parseInt(month, 10) : undefined;
    
    // Validar que month esté en rango válido si se proporciona
    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      throw new NotFoundException('El mes debe estar entre 1 y 12');
    }
    
    return this.budgetsService.getDailyAllowance(user.uid, targetYear, targetMonth);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un presupuesto existente' })
  @ApiResponse({ status: 200, description: 'Presupuesto actualizado correctamente' })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  update(
    @GetUser() user: DecodedIdToken,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.uid, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un presupuesto' })
  @ApiResponse({ status: 200, description: 'Presupuesto eliminado correctamente' })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  remove(@GetUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.budgetsService.remove(user.uid, id);
  }
}
