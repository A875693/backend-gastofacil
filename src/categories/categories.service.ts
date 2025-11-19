import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { BaseCategory, CustomCategory, CategoriesResponse, CategoriesMetadata, CategoryUsageResponse, CategoryValidationResponse } from './interfaces/category.interface';
import { CreateCustomCategoryDto } from './dto/create-custom-category.dto';
import { UpdateCustomCategoryDto } from './dto/update-custom-category.dto';

/**
 * Generate gradient from base color (lighter shade)
 */
function generateGradient(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Increase brightness by 20%
  const lighten = (value: number) => Math.min(255, Math.floor(value + (255 - value) * 0.2));
  
  const newR = lighten(r).toString(16).padStart(2, '0');
  const newG = lighten(g).toString(16).padStart(2, '0');
  const newB = lighten(b).toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`.toUpperCase();
}

const BASE_CATEGORIES: BaseCategory[] = [
  { id: 'food', name: 'food', icon: 'fast-food-outline', color: '#EF4444', gradient: generateGradient('#EF4444'), isCustom: false },
  { id: 'transport', name: 'transport', icon: 'car-outline', color: '#3B82F6', gradient: generateGradient('#3B82F6'), isCustom: false },
  { id: 'entertainment', name: 'entertainment', icon: 'game-controller-outline', color: '#8B5CF6', gradient: generateGradient('#8B5CF6'), isCustom: false },
  { id: 'shopping', name: 'shopping', icon: 'cart-outline', color: '#EC4899', gradient: generateGradient('#EC4899'), isCustom: false },
  { id: 'health', name: 'health', icon: 'medical-outline', color: '#10B981', gradient: generateGradient('#10B981'), isCustom: false },
  { id: 'education', name: 'education', icon: 'school-outline', color: '#F59E0B', gradient: generateGradient('#F59E0B'), isCustom: false },
  { id: 'bills', name: 'bills', icon: 'receipt-outline', color: '#6366F1', gradient: generateGradient('#6366F1'), isCustom: false },
  { id: 'subscriptions', name: 'subscriptions', icon: 'repeat-outline', color: '#14B8A6', gradient: generateGradient('#14B8A6'), isCustom: false },
  { id: 'travel', name: 'travel', icon: 'airplane-outline', color: '#06B6D4', gradient: generateGradient('#06B6D4'), isCustom: false },
  { id: 'others', name: 'others', icon: 'ellipsis-horizontal-outline', color: '#6B7280', gradient: generateGradient('#6B7280'), isCustom: false },
];

@Injectable()
export class CategoriesService {
  private readonly CUSTOM_CATEGORIES_COLLECTION = 'customCategories';
  private readonly MAX_CUSTOM_CATEGORIES = 50;

  /**
   * Get all categories (base + custom) for a user
   */
  async findAll(userId: string): Promise<CategoriesResponse> {
    const customCategoriesSnapshot = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const customCategories: CustomCategory[] = customCategoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<CustomCategory, 'id'>,
    }));

    const metadata: CategoriesMetadata = {
      customCount: customCategories.length,
      maxCustom: this.MAX_CUSTOM_CATEGORIES,
      canCreateMore: customCategories.length < this.MAX_CUSTOM_CATEGORIES,
    };

    return {
      base: BASE_CATEGORIES,
      custom: customCategories,
      metadata,
    };
  }

  /**
   * Crea una nueva categoría personalizada para un usuario
   */
  async create(userId: string, dto: CreateCustomCategoryDto): Promise<CustomCategory> {
    const existingCategories = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    if (existingCategories.size >= this.MAX_CUSTOM_CATEGORIES) {
      throw new ConflictException(
        `Has alcanzado el límite máximo de ${this.MAX_CUSTOM_CATEGORIES} categorías personalizadas`,
      );
    }

    const normalizedName = dto.name.trim().toLowerCase();
    
    const baseNameExists = BASE_CATEGORIES.some(
      cat => cat.name.toLowerCase() === normalizedName,
    );
    if (baseNameExists) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    const customNameExists = existingCategories.docs.some(
      doc => doc.data().name.toLowerCase() === normalizedName,
    );
    if (customNameExists) {
      throw new ConflictException('Ya tienes una categoría personalizada con ese nombre');
    }

    const now = new Date().toISOString();
    const color = dto.color.toUpperCase();
    const gradient = generateGradient(color);
    
    const newCategory: Omit<CustomCategory, 'id'> = {
      name: dto.name.trim(),
      icon: dto.icon,
      color,
      gradient,
      userId,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .add(newCategory);

    return {
      id: docRef.id,
      ...newCategory,
    };
  }

  /**
   * Actualiza una categoría personalizada
   */
  async update(
    userId: string,
    categoryId: string,
    dto: UpdateCustomCategoryDto,
  ): Promise<CustomCategory> {
    const categoryDoc = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .doc(categoryId)
      .get();

    if (!categoryDoc.exists) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const categoryData = categoryDoc.data() as CustomCategory;

    if (categoryData.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para modificar esta categoría');
    }

    if (dto.name) {
      const normalizedName = dto.name.trim().toLowerCase();
      const currentName = categoryData.name.toLowerCase();

      if (normalizedName !== currentName) {
        const baseNameExists = BASE_CATEGORIES.some(
          cat => cat.name.toLowerCase() === normalizedName,
        );
        if (baseNameExists) {
          throw new ConflictException('Ya existe una categoría con ese nombre');
        }

        const otherCustomCategories = await admin.firestore()
          .collection(this.CUSTOM_CATEGORIES_COLLECTION)
          .where('userId', '==', userId)
          .get();

        const customNameExists = otherCustomCategories.docs.some(
          doc => doc.id !== categoryId && doc.data().name.toLowerCase() === normalizedName,
        );
        if (customNameExists) {
          throw new ConflictException('Ya tienes una categoría personalizada con ese nombre');
        }
      }
    }

    // Update the category
    const updates: Partial<CustomCategory> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.name) updates.name = dto.name.trim();
    if (dto.icon) updates.icon = dto.icon;
    if (dto.color) {
      updates.color = dto.color.toUpperCase();
      updates.gradient = generateGradient(updates.color);
    }

    await categoryDoc.ref.update(updates);

    return {
      id: categoryDoc.id,
      ...categoryData,
      ...updates,
    };
  }

  /**
   * Elimina una categoría personalizada
   */
  async delete(userId: string, categoryId: string): Promise<void> {
    const categoryDoc = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .doc(categoryId)
      .get();

    if (!categoryDoc.exists) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const categoryData = categoryDoc.data() as CustomCategory;

    if (categoryData.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta categoría');
    }

    const expensesSnapshot = await admin.firestore()
      .collection('expenses')
      .where('userId', '==', userId)
      .where('category', '==', categoryId)
      .get();

    if (!expensesSnapshot.empty) {
      const batch = admin.firestore().batch();
      expensesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { category: 'others' });
      });
      await batch.commit();
    }

    await categoryDoc.ref.delete();
  }

  /**
   * Verifica cuántos gastos usan esta categoría
   */
  async getCategoryUsage(userId: string, categoryId: string): Promise<CategoryUsageResponse> {
    const isBase = BASE_CATEGORIES.some(cat => cat.id === categoryId);
    
    if (!isBase) {
      const categoryDoc = await admin.firestore()
        .collection(this.CUSTOM_CATEGORIES_COLLECTION)
        .doc(categoryId)
        .get();

      if (!categoryDoc.exists) {
        throw new NotFoundException('Categoría no encontrada');
      }

      const categoryData = categoryDoc.data() as CustomCategory;
      if (categoryData.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para acceder a esta categoría');
      }
    }

    const expensesSnapshot = await admin.firestore()
      .collection('expenses')
      .where('userId', '==', userId)
      .where('category', '==', categoryId)
      .get();

    const count = expensesSnapshot.size;
    const canDelete = isBase ? false : true;

    return {
      count,
      canDelete,
      message: count > 0 
        ? `Esta categoría está siendo usada en ${count} gasto${count > 1 ? 's' : ''}. Al eliminarla, se cambiarán a "Otros".`
        : 'Esta categoría no está siendo usada en ningún gasto.',
    };
  }

  /**
   * Valida si un nombre de categoría está disponible
   */
  async validateCategoryName(userId: string, name: string): Promise<CategoryValidationResponse> {
    const normalizedName = name.trim().toLowerCase();

    const baseCategory = BASE_CATEGORIES.find(
      cat => cat.id.toLowerCase() === normalizedName,
    );
    if (baseCategory) {
      return {
        available: false,
        existingId: baseCategory.id,
        message: 'Ya existe una categoría base con ese nombre',
      };
    }

    const customCategoriesSnapshot = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const existingCustom = customCategoriesSnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === normalizedName,
    );

    if (existingCustom) {
      return {
        available: false,
        existingId: existingCustom.id,
        message: 'Ya tienes una categoría personalizada con ese nombre',
      };
    }

    return {
      available: true,
      message: 'El nombre está disponible',
    };
  }

  /**
   * Obtiene una categoría personalizada por ID
   */
  async findOne(userId: string, categoryId: string): Promise<CustomCategory> {
    const categoryDoc = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .doc(categoryId)
      .get();

    if (!categoryDoc.exists) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const categoryData = categoryDoc.data() as CustomCategory;

    if (categoryData.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para acceder a esta categoría');
    }

    return {
      id: categoryDoc.id,
      ...categoryData,
    };
  }

  /**
   * Valida si una categoría existe (base o personalizada del usuario)
   */
  async validateCategory(userId: string, categoryId: string): Promise<boolean> {
    const isBaseCategory = BASE_CATEGORIES.some(cat => cat.id === categoryId);
    if (isBaseCategory) {
      return true;
    }

    const categoryDoc = await admin.firestore()
      .collection(this.CUSTOM_CATEGORIES_COLLECTION)
      .doc(categoryId)
      .get();

    if (!categoryDoc.exists) {
      return false;
    }

    const categoryData = categoryDoc.data() as CustomCategory;
    return categoryData.userId === userId;
  }
}
