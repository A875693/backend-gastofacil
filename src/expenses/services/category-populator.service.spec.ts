import { Test, TestingModule } from '@nestjs/testing';
import { CategoryPopulatorService } from './category-populator.service';
import { Expense } from '../interfaces/expense.interface';
import * as admin from 'firebase-admin';

// Mock Firebase Admin - must be defined before jest.mock
const mockFirestore = {
  collection: jest.fn(),
};

jest.mock('firebase-admin', () => {
  const mockFirestoreFn: any = jest.fn(() => mockFirestore);
  mockFirestoreFn.FieldPath = {
    documentId: () => '__name__',
  };

  return {
    firestore: mockFirestoreFn,
  };
});

describe('CategoryPopulatorService', () => {
  let service: CategoryPopulatorService;
  let collectionMock: any;

  const mockCategoryData = {
    userId: 'user-1',
    name: 'Fitness',
    icon: 'barbell-outline',
    color: '#10B981',
    gradient: '#33C49E',
  };

  beforeEach(async () => {
    collectionMock = {
      doc: jest.fn(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    // Configure the global mock
    mockFirestore.collection.mockReturnValue(collectionMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryPopulatorService],
    }).compile();

    service = module.get<CategoryPopulatorService>(CategoryPopulatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('populateExpense', () => {
    it('should return expense unchanged if category is a base category', async () => {
      const expense: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 50,
        currency: 'EUR',
        category: 'food',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const result = await service.populateExpense(expense, 'user-1');

      expect(result).toEqual(expense);
      expect(result.categoryDetails).toBeUndefined();
      expect(collectionMock.doc).not.toHaveBeenCalled();
    });

    it('should populate categoryDetails for custom category', async () => {
      const expense: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'credit_card',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const docMock = {
        exists: true,
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.populateExpense(expense, 'user-1');

      expect(result.categoryDetails).toEqual({
        id: 'custom-123',
        name: 'Fitness',
        icon: 'barbell-outline',
        color: '#10B981',
        gradient: '#33C49E',
        isCustom: true,
      });
      expect(collectionMock.doc).toHaveBeenCalledWith('custom-123');
    });

    it('should cache custom category after first fetch', async () => {
      const expense1: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const expense2: Expense = {
        id: 'exp-2',
        userId: 'user-1',
        amount: 50,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-16'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
      };

      const docMock = {
        exists: true,
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      const getMock = jest.fn().mockResolvedValue(docMock);
      collectionMock.doc.mockReturnValue({ get: getMock });

      await service.populateExpense(expense1, 'user-1');
      await service.populateExpense(expense2, 'user-1');

      expect(getMock).toHaveBeenCalledTimes(1);
    });

    it('should return expense unchanged if custom category not found', async () => {
      const expense: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-nonexistent',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const docMock = {
        exists: false,
      };

      collectionMock.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(docMock),
      });

      const result = await service.populateExpense(expense, 'user-1');

      expect(result).toEqual(expense);
      expect(result.categoryDetails).toBeUndefined();
    });

    it('should handle expenses without category gracefully', async () => {
      const expense: any = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
      };

      const result = await service.populateExpense(expense, 'user-1');

      expect(result).toEqual(expense);
      expect(result.categoryDetails).toBeUndefined();
    });
  });

  describe('populateExpenses', () => {
    it('should populate multiple expenses efficiently with batch fetching', async () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          userId: 'user-1',
          amount: 100,
          currency: 'EUR',
          category: 'custom-123',
          date: new Date('2024-01-15'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'exp-2',
          userId: 'user-1',
          amount: 50,
          currency: 'EUR',
          category: 'food',
          date: new Date('2024-01-16'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
        },
        {
          id: 'exp-3',
          userId: 'user-1',
          amount: 200,
          currency: 'EUR',
          category: 'custom-123',
          date: new Date('2024-01-17'),
          paymentMethod: 'credit_card',
          tags: [],
          createdAt: new Date('2024-01-17'),
          updatedAt: new Date('2024-01-17'),
        },
      ];

      const batchDocMock = {
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      collectionMock.get.mockResolvedValue({
        docs: [batchDocMock],
      });

      const result = await service.populateExpenses(expenses, 'user-1');

      expect(result).toHaveLength(3);
      expect(result[0].categoryDetails).toBeDefined();
      expect(result[1].categoryDetails).toBeUndefined(); // Base category
      expect(result[2].categoryDetails).toBeDefined();
      
      // Should use batch query
      expect(collectionMock.where).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      const result = await service.populateExpenses([], 'user-1');

      expect(result).toEqual([]);
      expect(collectionMock.where).not.toHaveBeenCalled();
    });

    it('should handle all base categories', async () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          userId: 'user-1',
          amount: 50,
          currency: 'EUR',
          category: 'food',
          date: new Date('2024-01-15'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'exp-2',
          userId: 'user-1',
          amount: 30,
          currency: 'EUR',
          category: 'transport',
          date: new Date('2024-01-16'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
        },
      ];

      const result = await service.populateExpenses(expenses, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].categoryDetails).toBeUndefined();
      expect(result[1].categoryDetails).toBeUndefined();
      expect(collectionMock.where).not.toHaveBeenCalled();
    });

    it('should handle multiple different custom categories', async () => {
      const mockCategoryData2 = {
        userId: 'user-1',
        name: 'Photography',
        icon: 'camera-outline',
        color: '#F59E0B',
        gradient: '#F7B73D',
      };

      const expenses: Expense[] = [
        {
          id: 'exp-1',
          userId: 'user-1',
          amount: 100,
          currency: 'EUR',
          category: 'custom-123',
          date: new Date('2024-01-15'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'exp-2',
          userId: 'user-1',
          amount: 500,
          currency: 'EUR',
          category: 'custom-456',
          date: new Date('2024-01-16'),
          paymentMethod: 'credit_card',
          tags: [],
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
        },
      ];

      const batchDocMocks = [
        {
          id: 'custom-123',
          data: () => mockCategoryData,
        },
        {
          id: 'custom-456',
          data: () => mockCategoryData2,
        },
      ];

      collectionMock.get.mockResolvedValue({
        docs: batchDocMocks,
      });

      const result = await service.populateExpenses(expenses, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].categoryDetails?.name).toBe('Fitness');
      expect(result[1].categoryDetails?.name).toBe('Photography');
    });

    it('should handle mix of valid and invalid custom categories', async () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          userId: 'user-1',
          amount: 100,
          currency: 'EUR',
          category: 'custom-123',
          date: new Date('2024-01-15'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'exp-2',
          userId: 'user-1',
          amount: 50,
          currency: 'EUR',
          category: 'custom-nonexistent',
          date: new Date('2024-01-16'),
          paymentMethod: 'cash',
          tags: [],
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
        },
      ];

      const batchDocMocks = [
        {
          id: 'custom-123',
          data: () => mockCategoryData,
        },
      ];

      collectionMock.get.mockResolvedValue({
        docs: batchDocMocks,
      });

      const result = await service.populateExpenses(expenses, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].categoryDetails).toBeDefined();
      expect(result[1].categoryDetails).toBeUndefined();
    });
  });

  describe('clearUserCache', () => {
    it('should clear cache for specific user', async () => {
      const expense: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const docMock = {
        exists: true,
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      const getMock = jest.fn().mockResolvedValue(docMock);
      collectionMock.doc.mockReturnValue({ get: getMock });

      // First call - should fetch
      await service.populateExpense(expense, 'user-1');
      expect(getMock).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.populateExpense(expense, 'user-1');
      expect(getMock).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearUserCache('user-1');

      // Third call - should fetch again
      await service.populateExpense(expense, 'user-1');
      expect(getMock).toHaveBeenCalledTimes(2);
    });

    it('should not affect other users cache', async () => {
      const expense1: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const expense2: Expense = {
        id: 'exp-2',
        userId: 'user-2',
        amount: 50,
        currency: 'EUR',
        category: 'custom-456',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const docMock1 = {
        exists: true,
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      const docMock2 = {
        exists: true,
        id: 'custom-456',
        data: () => ({ ...mockCategoryData, userId: 'user-2', name: 'Other Category' }),
      };

      const getMock = jest.fn()
        .mockResolvedValueOnce(docMock1)
        .mockResolvedValueOnce(docMock2)
        .mockResolvedValueOnce(docMock2)
        .mockResolvedValueOnce(docMock1);

      collectionMock.doc.mockReturnValue({ get: getMock });

      await service.populateExpense(expense1, 'user-1');
      await service.populateExpense(expense2, 'user-2');
      expect(getMock).toHaveBeenCalledTimes(2);

      // Clear only user-1 cache
      service.clearUserCache('user-1');

      // user-2 should still use cache
      await service.populateExpense(expense2, 'user-2');
      expect(getMock).toHaveBeenCalledTimes(2);

      // user-1 should fetch again
      await service.populateExpense(expense1, 'user-1');
      expect(getMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('cache behavior', () => {
    it('should use separate caches for different users', async () => {
      const expense1: Expense = {
        id: 'exp-1',
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const expense2: Expense = {
        id: 'exp-2',
        userId: 'user-2',
        amount: 50,
        currency: 'EUR',
        category: 'custom-123',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      const docMock1 = {
        exists: true,
        id: 'custom-123',
        data: () => ({ ...mockCategoryData, userId: 'user-1' }),
      };

      const docMock2 = {
        exists: true,
        id: 'custom-123',
        data: () => ({ ...mockCategoryData, userId: 'user-2', name: 'Different Name' }),
      };

      const getMock = jest.fn()
        .mockResolvedValueOnce(docMock1)
        .mockResolvedValueOnce(docMock2);

      collectionMock.doc.mockReturnValue({ get: getMock });

      const result1 = await service.populateExpense(expense1, 'user-1');
      const result2 = await service.populateExpense(expense2, 'user-2');

      expect(getMock).toHaveBeenCalledTimes(2);
      expect(result1.categoryDetails?.name).toBe('Fitness');
      expect(result2.categoryDetails?.name).toBe('Different Name');
    });

    it('should handle concurrent requests efficiently', async () => {
      const expenses: Expense[] = Array.from({ length: 20 }, (_, i) => ({
        id: `exp-${i}`,
        userId: 'user-1',
        amount: 100,
        currency: 'EUR',
        category: i % 2 === 0 ? 'custom-123' : 'food',
        date: new Date('2024-01-15'),
        paymentMethod: 'cash',
        tags: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }));

      const batchDocMock = {
        id: 'custom-123',
        data: () => mockCategoryData,
      };

      collectionMock.get.mockResolvedValue({
        docs: [batchDocMock],
      });

      const results = await service.populateExpenses(expenses, 'user-1');

      expect(results).toHaveLength(20);
      // Should only fetch custom-123 once via batch query
      expect(collectionMock.where).toHaveBeenCalled();
    });
  });
});
