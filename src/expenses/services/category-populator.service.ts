import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Expense, CustomCategoryDetails } from '../interfaces/expense.interface';

/**
 * Servicio para poblar categoryDetails en gastos
 * cuando la categoría es personalizada
 */
@Injectable()
export class CategoryPopulatorService {
  private readonly CUSTOM_CATEGORIES_COLLECTION = 'customCategories';
  
  private categoryCache = new Map<string, CustomCategoryDetails | null>();
  
  /**
   * Pobla categoryDetails para un gasto individual
   */
  async populateExpense(expense: Expense, userId: string): Promise<Expense> {
    if (!expense || !expense.category) {
      return expense;
    }

    const isBaseCategory = this.isBaseCategory(expense.category);
    
    if (isBaseCategory) {
      return expense;
    }

    const cacheKey = `${userId}-${expense.category}`;
    if (this.categoryCache.has(cacheKey)) {
      const cachedDetails = this.categoryCache.get(cacheKey);
      return {
        ...expense,
        categoryDetails: cachedDetails || undefined,
      };
    }

    const categoryDetails = await this.fetchCategoryDetails(expense.category, userId);
    
    this.categoryCache.set(cacheKey, categoryDetails);

    return {
      ...expense,
      categoryDetails: categoryDetails || undefined,
    };
  }

  /**
   * Pobla categoryDetails para múltiples gastos con optimización batch
   */
  async populateExpenses(expenses: Expense[], userId: string): Promise<Expense[]> {
    if (!expenses || expenses.length === 0) {
      return expenses;
    }

    const customCategoryIds = new Set<string>();
    
    for (const expense of expenses) {
      if (expense.category && !this.isBaseCategory(expense.category)) {
        customCategoryIds.add(expense.category);
      }
    }

    if (customCategoryIds.size > 0) {
      await this.batchFetchCategories(Array.from(customCategoryIds), userId);
    }

    return Promise.all(
      expenses.map(expense => this.populateExpense(expense, userId))
    );
  }

  /**
   * Verifica si una categoría es base (predefinida)
   */
  private isBaseCategory(categoryId: string): boolean {
    const baseCategories = [
      'food',
      'transport',
      'entertainment',
      'shopping',
      'health',
      'education',
      'bills',
      'subscriptions',
      'travel',
      'others',
    ];
    
    return baseCategories.includes(categoryId);
  }

  /**
   * Obtiene detalles de categoría desde Firestore
   */
  private async fetchCategoryDetails(
    categoryId: string,
    userId: string,
  ): Promise<CustomCategoryDetails | null> {
    try {
      const categoryDoc = await admin.firestore()
        .collection(this.CUSTOM_CATEGORIES_COLLECTION)
        .doc(categoryId)
        .get();

      if (!categoryDoc.exists) {
        return null;
      }

      const data = categoryDoc.data();
      
      if (data?.userId !== userId) {
        return null;
      }

      return {
        id: categoryDoc.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        gradient: data.gradient,
        isCustom: true,
      };
    } catch (error) {
      console.error(`Error fetching category ${categoryId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene múltiples categorías en batch y las cachea
   */
  private async batchFetchCategories(
    categoryIds: string[],
    userId: string,
  ): Promise<void> {
    try {
      const batchSize = 10;
      
      for (let i = 0; i < categoryIds.length; i += batchSize) {
        const batch = categoryIds.slice(i, i + batchSize);
        
        const snapshot = await admin.firestore()
          .collection(this.CUSTOM_CATEGORIES_COLLECTION)
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .where('userId', '==', userId)
          .get();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const cacheKey = `${userId}-${doc.id}`;
          
          this.categoryCache.set(cacheKey, {
            id: doc.id,
            name: data.name,
            icon: data.icon,
            color: data.color,
            gradient: data.gradient,
            isCustom: true,
          });
        });

        batch.forEach(categoryId => {
          const cacheKey = `${userId}-${categoryId}`;
          if (!this.categoryCache.has(cacheKey)) {
            this.categoryCache.set(cacheKey, null);
          }
        });
      }
    } catch (error) {
      console.error('Error batch fetching categories:', error);
    }
  }

  /**
   * Limpia el caché para un usuario específico
   */
  clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    this.categoryCache.forEach((_, key) => {
      if (key.startsWith(`${userId}-`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.categoryCache.delete(key));
  }

  /**
   * Clear entire cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.categoryCache.clear();
  }
}
