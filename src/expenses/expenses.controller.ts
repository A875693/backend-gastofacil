/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { DecodedIdToken } from 'firebase-admin/auth';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard) // 👈 aquí también
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo gasto' })
  create(@GetUser() user: DecodedIdToken, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.uid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los gastos del usuario' })
  findAll(@GetUser() user: DecodedIdToken) {
    return this.expensesService.findAll(user.uid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un gasto concreto por su ID' })
  findOne(@GetUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.expensesService.findOne(user.uid, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un gasto existente por su ID' })
  update(@GetUser() user: DecodedIdToken, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(user.uid, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un gasto por su ID' })
  remove(@GetUser() user: DecodedIdToken, @Param('id') id: string) {
    return this.expensesService.remove(user.uid, id);
  }
}
