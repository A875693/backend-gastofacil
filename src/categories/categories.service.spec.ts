import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(),
    batch: jest.fn(),
  };
  
  return {
    firestore: jest.fn(() => mockFirestore),
  };
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let firestoreMock: any;
  let collectionMock: any;

  beforeEach(async () => {
    // Setup Firestore mocks
    collectionMock = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      add: jest.fn(),
      doc: jest.fn(),
    };

    firestoreMock = admin.firestore();
    firestoreMock.collection = jest.fn().mockReturnValue(collectionMock);
    firestoreMock.batch = jest.fn().mockReturnValue({
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return base categories and custom categories with metadata', async () => {
      const userId = 'test-user';
      const customCategories = [
        {
          id: 'custom1',
          data: () => ({
            userId,
            name: 'My Custom Category',
            icon: 'star-outline',
            color: '#FF5733',
            gradient: '#FF8866',
            isCustom: true,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        docs: customCategories,
      });

      const result = await service.findAll(userId);

      expect(result.base).toHaveLength(10);
      expect(result.custom).toHaveLength(1);
      expect(result.custom[0].name).toBe('My Custom Category');
      expect(result.metadata.customCount).toBe(1);
      expect(result.metadata.canCreateMore).toBe(true);
      expect(result.metadata.maxCustom).toBe(50);
    });

    it('should return empty custom categories if user has none', async () => {
      const userId = 'test-user';

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        docs: [],
      });

      const result = await service.findAll(userId);

      expect(result.base).toHaveLength(10);
      expect(result.custom).toHaveLength(0);
      expect(result.metadata.customCount).toBe(0);
      expect(result.metadata.canCreateMore).toBe(true);
      expect(result.metadata.maxCustom).toBe(50);
    });

    it('should indicate cannot create more when at limit', async () => {
      const userId = 'test-user';
      const customCategories = Array.from({ length: 50 }, (_, i) => ({
        id: `custom${i}`,
        data: () => ({
          userId,
          name: `Category ${i}`,
          icon: 'star-outline',
          color: '#FF5733',
          gradient: '#FF8866',
          isCustom: true,
        }),
      }));

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        docs: customCategories,
      });

      const result = await service.findAll(userId);

      expect(result.custom).toHaveLength(50);
      expect(result.metadata.canCreateMore).toBe(false);
      expect(result.metadata.customCount).toBe(50);
    });
  });

  describe('create', () => {
    it('should create a custom category successfully', async () => {
      const userId = 'test-user';
      const dto = {
        name: 'Fitness',
        icon: 'barbell-outline',
        color: '#10B981',
      };

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValueOnce({ docs: [] }); // No existing categories with same name
      collectionMock.get.mockResolvedValueOnce({ docs: [] }); // 0 custom categories (under limit)
      
      const docRef = { id: 'new-custom-id' };
      collectionMock.add.mockResolvedValue(docRef);

      const result = await service.create(userId, dto);

      expect(result.id).toBe('new-custom-id');
      expect(result.name).toBe('Fitness');
      expect(result.icon).toBe('barbell-outline');
      expect(result.color).toBe('#10B981');
      expect(result.gradient).toBeDefined();
      expect(result.isCustom).toBe(true);
      expect(result.userId).toBe(userId);
      expect(collectionMock.add).toHaveBeenCalled();
    });

    it('should throw ConflictException when name already exists', async () => {
      const userId = 'test-user';
      const dto = {
        name: 'food', // Base category name
        icon: 'star-outline',
        color: '#FF5733',
      };

      // Mock para que pase la verificación de límite
      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: [], size: 0 });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when user has duplicate custom category name', async () => {
      const userId = 'test-user';
      const dto = {
        name: 'Fitness',
        icon: 'barbell-outline',
        color: '#10B981',
      };

      const existingCategory = [
        {
          id: 'existing',
          data: () => ({ name: 'Fitness' }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ 
        docs: existingCategory,
        size: 1
      });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when user has reached category limit', async () => {
      const userId = 'test-user';
      const dto = {
        name: 'New Category',
        icon: 'star-outline',
        color: '#FF5733',
      };

      const fiftyCategories = Array.from({ length: 50 }, (_, i) => ({
        id: `cat${i}`,
        data: () => ({ name: `Category ${i}` }),
      }));

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ 
        docs: fiftyCategories,
        size: 50
      });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('should generate gradient automatically from color', async () => {
      const userId = 'test-user';
      const dto = {
        name: 'Test',
        icon: 'star-outline',
        color: '#FF5733',
      };

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: [], size: 0 });
      
      const docRef = { id: 'new-id' };
      collectionMock.add.mockResolvedValue(docRef);

      const result = await service.create(userId, dto);

      expect(result.gradient).toBeDefined();
      expect(result.gradient).toMatch(/^#[0-9A-F]{6}$/);
      expect(result.gradient).not.toBe(result.color);
    });
  });

  describe('update', () => {
    it('should update a custom category successfully', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';
      const dto = {
        name: 'Updated Name',
        icon: 'flame-outline',
        color: '#3B82F6',
      };

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId,
          name: 'Old Name',
          icon: 'star-outline',
          color: '#FF5733',
          gradient: '#FF8866',
          isCustom: true,
        }),
        ref: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: [] }); // No name conflicts

      const result = await service.update(userId, categoryId, dto);

      expect(result.name).toBe('Updated Name');
      expect(result.icon).toBe('flame-outline');
      expect(result.color).toBe('#3B82F6');
      expect(result.gradient).toBeDefined();
      expect(docMock.ref.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const userId = 'test-user';
      const categoryId = 'non-existent';
      const dto = { name: 'Test' };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      await expect(service.update(userId, categoryId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating another users category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';
      const dto = { name: 'Test' };

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId: 'other-user',
          name: 'Category',
          icon: 'star-outline',
          color: '#FF5733',
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      await expect(service.update(userId, categoryId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when updated name conflicts', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';
      const dto = { name: 'Existing Name' };

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId,
          name: 'Old Name',
          icon: 'star-outline',
          color: '#FF5733',
        }),
        ref: { update: jest.fn() },
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const conflictingCategory = [
        {
          id: 'other-id',
          data: () => ({ name: 'Existing Name' }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: conflictingCategory });

      await expect(service.update(userId, categoryId, dto)).rejects.toThrow(ConflictException);
    });

    it('should allow updating without changing name', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';
      const dto = { icon: 'flame-outline' };

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId,
          name: 'Same Name',
          icon: 'star-outline',
          color: '#FF5733',
          gradient: '#FF8866',
          isCustom: true,
        }),
        ref: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.update(userId, categoryId, dto);

      expect(result.icon).toBe('flame-outline');
      expect(result.name).toBe('Same Name');
    });
  });

  describe('delete', () => {
    it('should delete category and update expenses to "others"', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId,
          name: 'To Delete',
        }),
        ref: {
          delete: jest.fn().mockResolvedValue(undefined),
        },
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      // Mock expenses using this category
      const expensesWithCategory = [
        { id: 'exp1', data: () => ({ category: categoryId }) },
        { id: 'exp2', data: () => ({ category: categoryId }) },
      ];

      firestoreMock.collection.mockImplementation((name: string) => {
        if (name === 'expenses') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: expensesWithCategory }),
          };
        }
        return collectionMock;
      });

      const batchMock = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      firestoreMock.batch.mockReturnValue(batchMock);

      await service.delete(userId, categoryId);

      expect(docMock.ref.delete).toHaveBeenCalled();
      expect(batchMock.update).toHaveBeenCalledTimes(2);
      expect(batchMock.commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const userId = 'test-user';
      const categoryId = 'non-existent';

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      await expect(service.delete(userId, categoryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another users category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId: 'other-user',
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      await expect(service.delete(userId, categoryId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCategoryUsage', () => {
    it('should return usage count for a category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          userId,
          name: 'Test Category',
        }),
      };

      const expensesWithCategory = [
        { id: 'exp1' },
        { id: 'exp2' },
        { id: 'exp3' },
      ];

      firestoreMock.collection.mockImplementation((name: string) => {
        if (name === 'customCategories') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(docMock),
            }),
          };
        }
        if (name === 'expenses') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ 
              docs: expensesWithCategory,
              size: 3,
            }),
          };
        }
        return collectionMock;
      });

      const result = await service.getCategoryUsage(userId, categoryId);

      expect(result.count).toBe(3);
      expect(result.canDelete).toBe(true);
      expect(result.message).toContain('3');
    });

    it('should return zero usage when category is not used', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          userId,
          name: 'Unused',
        }),
      };

      firestoreMock.collection.mockImplementation((name: string) => {
        if (name === 'customCategories') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(docMock),
            }),
          };
        }
        if (name === 'expenses') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ 
              docs: [],
              size: 0,
            }),
          };
        }
        return collectionMock;
      });

      const result = await service.getCategoryUsage(userId, categoryId);

      expect(result.count).toBe(0);
      expect(result.canDelete).toBe(true);
      expect(result.message).toContain('no está siendo usada');
    });
  });

  describe('validateCategoryName', () => {
    it('should return available true for valid unique name', async () => {
      const userId = 'test-user';
      const name = 'Unique Category';

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: [] });

      const result = await service.validateCategoryName(userId, name);

      expect(result.available).toBe(true);
      expect(result.existingId).toBeUndefined();
      expect(result.message).toBeDefined();
    });

    it('should return available false when name conflicts with base category', async () => {
      const userId = 'test-user';
      const name = 'food';

      const result = await service.validateCategoryName(userId, name);

      expect(result.available).toBe(false);
      expect(result.existingId).toBe('food');
      expect(result.message).toContain('categoría base');
    });

    it('should return available false when name conflicts with custom category', async () => {
      const userId = 'test-user';
      const name = 'Existing Custom';

      const existingCategory = [
        {
          id: 'custom1',
          data: () => ({ name: 'Existing Custom' }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({ docs: existingCategory });

      const result = await service.validateCategoryName(userId, name);

      expect(result.available).toBe(false);
      expect(result.existingId).toBe('custom1');
      expect(result.message).toContain('personalizada');
    });

    it('should be case-insensitive', async () => {
      const userId = 'test-user';
      const name = 'FOOD';

      const result = await service.validateCategoryName(userId, name);

      expect(result.available).toBe(false);
      expect(result.existingId).toBe('food');
      expect(result.message).toContain('categoría base');
    });
  });

  describe('validateCategory', () => {
    it('should return true for base category', async () => {
      const userId = 'test-user';
      const categoryId = 'food';

      const result = await service.validateCategory(userId, categoryId);

      expect(result).toBe(true);
    });

    it('should return true for users custom category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          userId,
          name: 'Custom',
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.validateCategory(userId, categoryId);

      expect(result).toBe(true);
    });

    it('should return false for non-existent category', async () => {
      const userId = 'test-user';
      const categoryId = 'invalid-category';

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await service.validateCategory(userId, categoryId);

      expect(result).toBe(false);
    });

    it('should return false for another users custom category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          userId: 'other-user',
          name: 'Other Users Category',
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.validateCategory(userId, categoryId);

      expect(result).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return custom category by id', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId,
          name: 'My Category',
          icon: 'star-outline',
          color: '#FF5733',
          gradient: '#FF8866',
          isCustom: true,
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.findOne(userId, categoryId);

      expect(result.id).toBe(categoryId);
      expect(result.name).toBe('My Category');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const userId = 'test-user';
      const categoryId = 'non-existent';

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      await expect(service.findOne(userId, categoryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing another users category', async () => {
      const userId = 'test-user';
      const categoryId = 'custom-id';

      const docMock = {
        exists: true,
        data: () => ({
          id: categoryId,
          userId: 'other-user',
        }),
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      await expect(service.findOne(userId, categoryId)).rejects.toThrow(ForbiddenException);
    });
  });
});
