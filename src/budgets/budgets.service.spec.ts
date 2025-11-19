import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { PeriodCalculatorService } from './period-calculator.service';
import { ExpensesService } from '../expenses/expenses.service';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

describe('BudgetsService', () => {
  let service: BudgetsService;
  let periodCalculator: jest.Mocked<PeriodCalculatorService>;
  let expensesService: jest.Mocked<ExpensesService>;
  let firestoreMock: any;
  let collectionMock: any;

  beforeEach(async () => {
    collectionMock = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      add: jest.fn(),
      doc: jest.fn(),
    };

    firestoreMock = {
      collection: jest.fn().mockReturnValue(collectionMock),
    };

    (admin.firestore as jest.Mock).mockReturnValue(firestoreMock);

    const mockPeriodCalculator = {
      calculatePeriodInfo: jest.fn(),
      getCurrentPeriodInfo: jest.fn(),
      getSpecificPeriodInfo: jest.fn(),
      isDateInCurrentPeriod: jest.fn(),
      isDateInSpecificPeriod: jest.fn(),
    };

    const mockExpensesService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: PeriodCalculatorService,
          useValue: mockPeriodCalculator,
        },
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    periodCalculator = module.get(PeriodCalculatorService);
    expensesService = module.get(ExpensesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      const userId = 'user-1';
      const dto = {
        amount: 1000,
        period: 'monthly' as const,
        alertThreshold: 80,
      };

      const docRef = { id: 'budget-1' };
      collectionMock.add.mockResolvedValue(docRef);

      const result = await service.create(userId, dto);

      expect(result.id).toBe('budget-1');
      expect(result.userId).toBe(userId);
      expect(result.amount).toBe(1000);
      expect(result.period).toBe('monthly');
      expect(result.alertThreshold).toBe(80);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should use default alertThreshold of 80 when not provided', async () => {
      const userId = 'user-1';
      const dto = {
        amount: 500,
        period: 'weekly' as const,
      };

      const docRef = { id: 'budget-2' };
      collectionMock.add.mockResolvedValue(docRef);

      const result = await service.create(userId, dto);

      expect(result.alertThreshold).toBe(80);
    });

    it('should include category when provided', async () => {
      const userId = 'user-1';
      const dto = {
        amount: 200,
        period: 'monthly' as const,
        category: 'food',
      };

      const docRef = { id: 'budget-3' };
      collectionMock.add.mockResolvedValue(docRef);

      const result = await service.create(userId, dto);

      expect(result.category).toBe('food');
    });
  });

  describe('findAll', () => {
    it('should return all budgets for a user', async () => {
      const userId = 'user-1';
      const budgets = [
        {
          id: 'budget-1',
          data: () => ({
            userId,
            amount: 1000,
            period: 'monthly',
            createdAt: new Date('2024-01-15'),
          }),
        },
        {
          id: 'budget-2',
          data: () => ({
            userId,
            amount: 500,
            period: 'weekly',
            createdAt: new Date('2024-01-10'),
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        forEach: (callback: any) => budgets.forEach(callback),
      });

      const result = await service.findAll(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('budget-1');
      expect(result[1].id).toBe('budget-2');
    });

    it('should sort budgets by createdAt descending', async () => {
      const userId = 'user-1';
      const budgets = [
        {
          id: 'budget-1',
          data: () => ({
            userId,
            amount: 1000,
            period: 'monthly',
            createdAt: new Date('2024-01-10'),
          }),
        },
        {
          id: 'budget-2',
          data: () => ({
            userId,
            amount: 500,
            period: 'weekly',
            createdAt: new Date('2024-01-20'),
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        forEach: (callback: any) => budgets.forEach(callback),
      });

      const result = await service.findAll(userId);

      expect(result[0].id).toBe('budget-2'); // Most recent first
      expect(result[1].id).toBe('budget-1');
    });

    it('should return empty array when user has no budgets', async () => {
      const userId = 'user-1';

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        forEach: (callback: any) => {},
      });

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return general budget (without category)', async () => {
      const userId = 'user-1';
      const budgets = [
        {
          id: 'budget-general',
          data: () => ({
            userId,
            amount: 1000,
            period: 'monthly',
            // No category field
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: false,
        docs: budgets,
      });

      const result = await service.findActive(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe('budget-general');
    });

    it('should return null when no general budget exists', async () => {
      const userId = 'user-1';
      const budgets = [
        {
          id: 'budget-category',
          data: () => ({
            userId,
            amount: 200,
            period: 'monthly',
            category: 'food',
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: false,
        docs: budgets,
      });

      const result = await service.findActive(userId);

      expect(result).toBeNull();
    });

    it('should return null when user has no budgets', async () => {
      const userId = 'user-1';

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await service.findActive(userId);

      expect(result).toBeNull();
    });

    it('should prioritize general budget over category budgets', async () => {
      const userId = 'user-1';
      const budgets = [
        {
          id: 'budget-category',
          data: () => ({
            userId,
            amount: 200,
            period: 'monthly',
            category: 'food',
          }),
        },
        {
          id: 'budget-general',
          data: () => ({
            userId,
            amount: 1000,
            period: 'monthly',
          }),
        },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: false,
        docs: budgets,
      });

      const result = await service.findActive(userId);

      expect(result?.id).toBe('budget-general');
    });
  });

  describe('update', () => {
    it('should update a budget successfully', async () => {
      const userId = 'user-1';
      const budgetId = 'budget-1';
      const dto = {
        amount: 1500,
        period: 'weekly' as const,
      };

      const originalData = {
        userId,
        amount: 1000,
        period: 'monthly',
      };

      const updatedData = {
        userId,
        amount: 1500,
        period: 'weekly',
        updatedAt: expect.any(Date),
      };

      const docRefMock = {
        get: jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => originalData })
          .mockResolvedValueOnce({ exists: true, data: () => updatedData }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      const result = await service.update(userId, budgetId, dto);

      expect(result.amount).toBe(1500);
      expect(result.period).toBe('weekly');
      expect(docRefMock.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when budget does not exist', async () => {
      const userId = 'user-1';
      const budgetId = 'non-existent';
      const dto = { amount: 1000 };

      const docRefMock = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      await expect(service.update(userId, budgetId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when budget belongs to another user', async () => {
      const userId = 'user-1';
      const budgetId = 'budget-1';
      const dto = { amount: 1000 };

      const docMock = {
        exists: true,
        data: () => ({
          userId: 'other-user',
          amount: 500,
        }),
      };

      const docRefMock = {
        get: jest.fn().mockResolvedValue(docMock),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      await expect(service.update(userId, budgetId, dto)).rejects.toThrow('No autorizado');
    });

    it('should only update provided fields', async () => {
      const userId = 'user-1';
      const budgetId = 'budget-1';
      const dto = { amount: 1500 }; // Only updating amount

      const originalData = {
        userId,
        amount: 1000,
        period: 'monthly',
        category: 'food',
      };

      const updatedData = {
        userId,
        amount: 1500,
        period: 'monthly',
        category: 'food',
        updatedAt: expect.any(Date),
      };

      const docRefMock = {
        get: jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => originalData })
          .mockResolvedValueOnce({ exists: true, data: () => updatedData }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      const result = await service.update(userId, budgetId, dto);

      expect(result.amount).toBe(1500);
      expect(result.period).toBe('monthly'); // Unchanged
      expect(result.category).toBe('food'); // Unchanged
    });
  });

  describe('remove', () => {
    it('should delete a budget successfully', async () => {
      const userId = 'user-1';
      const budgetId = 'budget-1';

      const docMock = {
        exists: true,
        data: () => ({
          userId,
          amount: 1000,
        }),
      };

      const docRefMock = {
        get: jest.fn().mockResolvedValue(docMock),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      await service.remove(userId, budgetId);

      expect(docRefMock.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when budget does not exist', async () => {
      const userId = 'user-1';
      const budgetId = 'non-existent';

      const docRefMock = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      await expect(service.remove(userId, budgetId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when budget belongs to another user', async () => {
      const userId = 'user-1';
      const budgetId = 'budget-1';

      const docMock = {
        exists: true,
        data: () => ({
          userId: 'other-user',
        }),
      };

      const docRefMock = {
        get: jest.fn().mockResolvedValue(docMock),
      };

      collectionMock.doc.mockReturnValue(docRefMock);

      await expect(service.remove(userId, budgetId)).rejects.toThrow('No autorizado');
    });
  });

  describe('getDailyAllowance', () => {
    it('should calculate daily allowance correctly', async () => {
      const userId = 'user-1';
      const budget = {
        id: 'budget-1',
        userId,
        amount: 3000,
        period: 'monthly' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expenses = [
        { amount: 100, date: new Date('2024-01-15'), category: 'food' },
        { amount: 200, date: new Date('2024-01-16'), category: 'transport' },
      ];

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'budget-1',
            data: () => budget,
          },
        ],
      });

      expensesService.findAll.mockResolvedValue(expenses as any);

      periodCalculator.getCurrentPeriodInfo.mockReturnValue({
        totalDays: 31,
        daysRemaining: 15,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      periodCalculator.isDateInCurrentPeriod.mockReturnValue(true);

      const result = await service.getDailyAllowance(userId);

      expect(result).toBeDefined();
      expect(result.totalBudget).toBe(3000);
      expect(result.spentThisPeriod).toBe(300);
      expect(result.remainingBudget).toBe(2700);
      expect(result.dailyAllowance).toBeDefined();
    });

    it('should throw NotFoundException when user has no budget', async () => {
      const userId = 'user-1';

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(service.getDailyAllowance(userId)).rejects.toThrow(NotFoundException);
    });

    it('should calculate correctly with no expenses', async () => {
      const userId = 'user-1';
      const budget = {
        id: 'budget-1',
        userId,
        amount: 1000,
        period: 'monthly' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      collectionMock.where.mockReturnThis();
      collectionMock.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'budget-1',
            data: () => budget,
          },
        ],
      });

      expensesService.findAll.mockResolvedValue([]);

      periodCalculator.getCurrentPeriodInfo.mockReturnValue({
        totalDays: 30,
        daysRemaining: 30,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-30'),
      });

      periodCalculator.isDateInCurrentPeriod.mockReturnValue(true);

      const result = await service.getDailyAllowance(userId);

      expect(result.spentThisPeriod).toBe(0);
      expect(result.remainingBudget).toBe(1000);
    });
  });
});

