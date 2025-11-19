import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { DailyAllowanceDto } from './dto/daily-allowance.dto';
import { Budget, BudgetPeriod, DailyAllowance } from './interfaces/budget.interface';
import { PeriodCalculatorService } from './period-calculator.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class BudgetsService {
  private collection = admin.firestore().collection('budgets');
  private firestore = admin.firestore();

  constructor(
    private periodCalculator: PeriodCalculatorService,
    private expensesService: ExpensesService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const now = new Date();
    const budget: any = {
      userId,
      amount: dto.amount,
      period: dto.period,
      alertThreshold: dto.alertThreshold || 80,
      createdAt: now,
      updatedAt: now,
    };

    if (dto.category !== undefined) {
      budget.category = dto.category;
    }

    const docRef = await this.collection.add(budget);
    return { ...budget, id: docRef.id };
  }

  async findAll(userId: string): Promise<Budget[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    const budgets: Budget[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as Budget;
      if (data) {
        budgets.push({ ...data, id: doc.id });
      }
    });
    
    return budgets.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  /**
   * Busca el presupuesto único del usuario
   * Solo busca presupuestos generales (sin categoría específica)
   */
  async findActive(userId: string): Promise<Budget | null> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) return null;

    const generalBudget = snapshot.docs.find(doc => {
      const data = doc.data();
      return !data.category || data.category === null || data.category === undefined;
    });

    if (!generalBudget) return null;

    const data = generalBudget.data() as Budget;
    return { ...data, id: generalBudget.id };
  }

  /**
   * Obtiene el presupuesto único del usuario
   * No crea automáticamente si no existe
   */
  async getUserBudget(userId: string): Promise<Budget | null> {
    return await this.findActive(userId);
  }

  /**
   * Crea o actualiza el presupuesto único del usuario
   * Garantiza que solo exista un presupuesto por usuario
   */
  async updateUserBudget(userId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const existingBudget = await this.findActive(userId);
    
    if (existingBudget && existingBudget.id) {
      return this.update(userId, existingBudget.id, dto);
    } else {
      const createDto: CreateBudgetDto = {
        amount: dto.amount || 0,
        period: dto.period || BudgetPeriod.MONTHLY,
        alertThreshold: dto.alertThreshold || 80,
      };
      
      if (dto.category !== undefined) {
        createDto.category = dto.category;
      }
      
      return this.create(userId, createDto);
    }
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const data = docSnap.data() as Budget;
    if (data.userId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.period !== undefined) updateData.period = dto.period;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.alertThreshold !== undefined) updateData.alertThreshold = dto.alertThreshold;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data() as Budget;
    return { ...updatedData, id };
  }

  async remove(userId: string, id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const data = docSnap.data() as Budget;
    if (data.userId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    await docRef.delete();
  }

  /**
   * Endpoint estrella: Calcula el gasto diario permitido
   * Considera presupuesto total, gastos del período y días restantes
   */
  async getDailyAllowance(userId: string, year?: number, month?: number): Promise<DailyAllowanceDto> {
    const activeBudget = await this.findActive(userId);
    
    if (!activeBudget) {
      throw new NotFoundException(
        'No tienes un presupuesto activo configurado. Crea uno para calcular tu gasto diario.'
      );
    }

    const periodInfo = year && month 
      ? this.periodCalculator.getSpecificPeriodInfo(activeBudget.period, year, month)
      : this.periodCalculator.getCurrentPeriodInfo(activeBudget.period);
    
    const expenses = await this.expensesService.findAll(userId);
    
    const expensesInPeriod = expenses.filter(expense => {
      let expenseDate: Date;
      
      if (expense.date instanceof Date) {
        expenseDate = expense.date;
      } else if (typeof expense.date === 'string') {
        expenseDate = new Date(expense.date);
      } else if (expense.date && typeof expense.date === 'object' && 'seconds' in expense.date) {
        expenseDate = new Date((expense.date as any).seconds * 1000);
      } else {
        return false;
      }
      
      if (isNaN(expenseDate.getTime())) {
        return false;
      }
      if (year && month) {
        return this.periodCalculator.isDateInSpecificPeriod(expenseDate, activeBudget.period, year, month);
      } else {
        return this.periodCalculator.isDateInCurrentPeriod(expenseDate, activeBudget.period);
      }
    });
    
    const spentThisPeriod = expensesInPeriod
      .reduce((total, expense) => total + Number(expense.amount), 0);

    const remainingBudget = activeBudget.amount - spentThisPeriod;
    
    const dailyAllowance = periodInfo.daysRemaining > 0 
      ? remainingBudget / periodInfo.daysRemaining 
      : 0;
    const daysElapsed = periodInfo.totalDays - periodInfo.daysRemaining;
    const averageDailySpent = daysElapsed > 0 ? spentThisPeriod / daysElapsed : 0;
    const projectedTotalSpent = averageDailySpent * periodInfo.totalDays;
    const projectedOverspend = Math.max(0, projectedTotalSpent - activeBudget.amount);

    const budgetProgress = spentThisPeriod / activeBudget.amount;
    const timeProgress = daysElapsed / periodInfo.totalDays;
    const isOnTrack = budgetProgress <= timeProgress * 1.1;

    const recommendations = this.generateRecommendations(
      dailyAllowance,
      remainingBudget,
      budgetProgress,
      activeBudget.alertThreshold / 100,
      periodInfo.daysRemaining
    );

    return {
      dailyAllowance: Math.max(0, Number(dailyAllowance.toFixed(2))),
      budgetPeriod: activeBudget.period,
      totalBudget: activeBudget.amount,
      spentThisPeriod: Number(spentThisPeriod.toFixed(2)),
      remainingBudget: Number(remainingBudget.toFixed(2)),
      daysLeftInPeriod: periodInfo.daysRemaining,
      isOnTrack,
      projectedOverspend: Number(projectedOverspend.toFixed(2)),
      recommendations,
    };
  }

  /**
   * Genera recomendaciones personalizadas basadas en el progreso del presupuesto
   */
  private generateRecommendations(
    dailyAllowance: number,
    remainingBudget: number,
    budgetProgress: number,
    alertThreshold: number,
    daysLeft: number
  ): string[] {
    const recommendations: string[] = [];

    if (remainingBudget <= 0) {
      recommendations.push('Has excedido tu presupuesto');
      recommendations.push('Considera revisar tus gastos recientes');
      recommendations.push('Evita gastos no esenciales hasta el próximo período');
    } else if (budgetProgress >= alertThreshold) {
      recommendations.push(`Has gastado ${Math.round(budgetProgress * 100)}% de tu presupuesto`);
      recommendations.push(`Puedes gastar €${dailyAllowance.toFixed(2)} por día los próximos ${daysLeft} días`);
      recommendations.push('Considera reducir gastos opcionales');
    } else if (budgetProgress > 0.5) {
      recommendations.push('Vas por buen camino pero mantente alerta');
      recommendations.push(`Puedes gastar €${dailyAllowance.toFixed(2)} hoy sin exceder tu presupuesto`);
    } else {
      recommendations.push('Excelente, estás muy por debajo de tu presupuesto');
      recommendations.push(`Puedes gastar €${dailyAllowance.toFixed(2)} hoy cómodamente`);
      recommendations.push('Considera ahorrar el excedente para futuras metas');
    }

    return recommendations;
  }

}
