import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface Expense {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  note?: string;
  date: Date;
  paymentMethod?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class ExpensesService {
  private collection = admin.firestore().collection('expenses');

  async create(uid: string, dto: CreateExpenseDto): Promise<Expense> {
    const now = new Date();
    
    // Crear objeto base sin campos undefined
    const expense: any = {
      userId: uid,
      amount: dto.amount,
      category: dto.category,
      date: new Date(dto.date),
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    // Solo agregar campos opcionales si no son undefined
    if (dto.note !== undefined) {
      expense.note = dto.note;
    }
    if (dto.paymentMethod !== undefined) {
      expense.paymentMethod = dto.paymentMethod;
    }

    const docRef = await this.collection.add(expense);
    return { ...expense, id: docRef.id };
  }

  async findAll(uid: string): Promise<Expense[]> {
    const snapshot = await this.collection.where('userId', '==', uid).get();
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Expense; // Tipamos explícitamente
      if (data) {
        expenses.push({ ...data, id: doc.id });
      }
    });
    return expenses;
  }

  async findOne(uid: string, id: string): Promise<Expense> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException('Gasto no encontrado');
    }

    const data = docSnap.data() as Expense | undefined;
    if (!data) throw new NotFoundException('Gasto no encontrado');
    if (data.userId !== uid) throw new ForbiddenException('No autorizado');

    return { ...data, id: docSnap.id };
  }

  async update(
    uid: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException('Gasto no encontrado');
    }

    const data = docSnap.data() as Expense | undefined;
    if (!data) throw new NotFoundException('Gasto no encontrado');
    if (data.userId !== uid) throw new ForbiddenException('No autorizado');

    // Crear objeto de actualización sin campos undefined
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Solo agregar campos que tienen valor
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    await docRef.update(updateData);

    // Obtener el documento actualizado
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data() as Expense;
    
    return { ...updatedData, id };
  }

  async remove(uid: string, id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException('Gasto no encontrado');
    }

    const data = docSnap.data() as Expense | undefined;
    if (!data) throw new NotFoundException('Gasto no encontrado');
    if (data.userId !== uid) throw new ForbiddenException('No autorizado');

    await docRef.delete();
  }
}
