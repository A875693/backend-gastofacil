import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UniversalExpensesQueryDto, UniversalStatsQueryDto } from './dto/expenses-filter-query.dto';
import { 
  UniversalExpensesResponse,
  UniversalStatsResponse
} from './interfaces/expense-stats.interface';
import { Expense } from './interfaces/expense.interface';

import { ExpensesCrudService } from './services/expenses-crud.service';
import { ExpensesQueryService } from './services/expenses-query.service';
import { ExpensesStatsService } from './services/expenses-stats.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly crudService: ExpensesCrudService,
    private readonly queryService: ExpensesQueryService,
    private readonly statsService: ExpensesStatsService
  ) {}

  /**
   * OPERACIONES CRUD
   * Delegadas a ExpensesCrudService para separación de responsabilidades
   */
  async create(uid: string, dto: CreateExpenseDto): Promise<Expense> {
    return this.crudService.create(uid, dto);
  }

  async findAll(uid: string): Promise<Expense[]> {
    return this.crudService.findAll(uid);
  }

  async findOne(uid: string, id: string): Promise<Expense> {
    return this.crudService.findOne(uid, id);
  }

  async update(uid: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    return this.crudService.update(uid, id, dto);
  }

  async remove(uid: string, id: string): Promise<void> {
    return this.crudService.remove(uid, id);
  }

  /**
   * MÉTODOS DE CONSULTA UNIVERSALES
   * API avanzada con filtros flexibles y agregaciones opcionales
   */
  async findExpenses(userId: string, query: UniversalExpensesQueryDto): Promise<UniversalExpensesResponse> {
    return this.queryService.findExpenses(userId, query);
  }

  async getUniversalStats(userId: string, query: UniversalStatsQueryDto): Promise<UniversalStatsResponse> {
    return this.statsService.getUniversalStats(userId, query);
  }
}
