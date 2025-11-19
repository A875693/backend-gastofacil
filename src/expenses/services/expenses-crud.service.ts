import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { Expense } from '../interfaces/expense.interface';
import { UserPreferencesService } from '../../users/services/user-preferences.service';
import { CategoryPopulatorService } from './category-populator.service';

@Injectable()
export class ExpensesCrudService {
  private readonly collection = admin.firestore().collection('expenses');

  constructor(
    private readonly userPreferencesService: UserPreferencesService,
    private readonly categoryPopulator: CategoryPopulatorService,
  ) {}

  /**
   * Valida que un documento existe y pertenece al usuario
   */
  private async validateDocumentOwnership(id: string, uid: string): Promise<Expense> {
    const docSnap = await this.collection.doc(id).get();
    
    if (!docSnap.exists) {
      throw new NotFoundException('Gasto no encontrado');
    }

    const data = docSnap.data() as Expense | undefined;
    if (!data || data.userId !== uid) {
      throw new ForbiddenException('No autorizado');
    }

    return { ...data, id };
  }

  /**
   * Construye objeto de datos limpio sin valores undefined
   */
  private buildCleanObject(source: any, fields: string[]): any {
    const result: any = {};
    fields.forEach(field => {
      if (source[field] !== undefined) {
        result[field] = source[field];
      }
    });
    return result;
  }

  async create(uid: string, dto: CreateExpenseDto): Promise<Expense> {
    this.validateMultiCurrencyData(dto);
    
    const now = new Date();
    
    const expense: any = {
      userId: uid,
      amount: dto.amount,
      currency: dto.currency,
      category: dto.category,
      date: new Date(dto.date),
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now,
      ...this.buildCleanObject(dto, ['note', 'paymentMethod'])
    };

    if (dto.originalAmount && dto.originalCurrency && dto.exchangeRate) {
      expense.originalAmount = dto.originalAmount;
      expense.originalCurrency = dto.originalCurrency;
      expense.exchangeRate = dto.exchangeRate;
      expense.conversionTimestamp = dto.conversionTimestamp || now;
    }

    const docRef = await this.collection.add(expense);
    const created = { ...expense, id: docRef.id };
    
    return this.categoryPopulator.populateExpense(created, uid);
  }

  async findAll(uid: string): Promise<Expense[]> {
    const snapshot = await this.collection.where('userId', '==', uid).orderBy('date', 'desc').get();
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Expense);
    
    return this.categoryPopulator.populateExpenses(expenses, uid);
  }

  async findOne(uid: string, id: string): Promise<Expense> {
    const expense = await this.validateDocumentOwnership(id, uid);
    
    return this.categoryPopulator.populateExpense(expense, uid);
  }

  async update(uid: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    await this.validateDocumentOwnership(id, uid);
    
    if (dto.currency || dto.originalAmount || dto.originalCurrency || dto.exchangeRate) {
      this.validateMultiCurrencyData(dto);
    }

    const now = new Date();
    const updateData: any = {
      updatedAt: now,
      ...this.buildCleanObject(dto, [
        'amount', 'currency', 'category', 'note', 'paymentMethod', 'tags'
      ])
    };

    if (dto.originalAmount || dto.originalCurrency || dto.exchangeRate) {
      updateData.originalAmount = dto.originalAmount;
      updateData.originalCurrency = dto.originalCurrency;
      updateData.exchangeRate = dto.exchangeRate;
      updateData.conversionTimestamp = dto.conversionTimestamp || now;
    }

    if (dto.date) updateData.date = new Date(dto.date);

    await this.collection.doc(id).update(updateData);
    
    const updatedDoc = await this.collection.doc(id).get();
    const updated = { ...updatedDoc.data(), id } as Expense;
    
    return this.categoryPopulator.populateExpense(updated, uid);
  }

  async remove(uid: string, id: string): Promise<void> {
    await this.validateDocumentOwnership(id, uid);
    await this.collection.doc(id).delete();
  }

  /**
   * Valida la consistencia de datos multi-moneda
   */
  private validateMultiCurrencyData(dto: CreateExpenseDto | UpdateExpenseDto): void {
    const { currency, originalAmount, originalCurrency, exchangeRate } = dto;
    
    if (!currency && dto.amount !== undefined) {
      throw new BadRequestException('Currency is required');
    }

    if (originalCurrency && originalCurrency === currency) {
      throw new BadRequestException('Original currency must be different from base currency when specified');
    }

    const hasOriginalAmount = originalAmount !== undefined && originalAmount !== null;
    const hasOriginalCurrency = originalCurrency !== undefined && originalCurrency !== null;
    const hasExchangeRate = exchangeRate !== undefined && exchangeRate !== null;
    
    const hasAnyOriginal = hasOriginalAmount || hasOriginalCurrency || hasExchangeRate;
    
    if (hasAnyOriginal) {
      if (!hasOriginalAmount) {
        throw new BadRequestException('Original amount is required when original currency data is provided');
      }
      
      if (!hasOriginalCurrency) {
        throw new BadRequestException('Original currency is required when original currency data is provided');
      }
      
      if (!hasExchangeRate) {
        throw new BadRequestException('Exchange rate is required when original currency data is provided');
      }
      
      if (dto.amount) {
        const calculatedAmount = originalAmount! / exchangeRate!;
        const tolerance = 0.01;
        
        if (Math.abs(calculatedAmount - dto.amount) > tolerance) {
          throw new BadRequestException(
            `Conversion calculation error: ${originalAmount} ${originalCurrency} / ${exchangeRate} = ${calculatedAmount} ${currency}, but amount is ${dto.amount} ${currency}`
          );
        }
      }
    }
  }
}