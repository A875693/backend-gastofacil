import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesAggregationService } from './expenses-aggregation.service';
import { CategoryPopulatorService } from './category-populator.service';

describe('ExpensesAggregationService', () => {
  let service: ExpensesAggregationService;
  let categoryPopulator: jest.Mocked<CategoryPopulatorService>;

  beforeEach(async () => {
    const mockCategoryPopulator = {
      populateExpenses: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesAggregationService,
        {
          provide: CategoryPopulatorService,
          useValue: mockCategoryPopulator,
        },
      ],
    }).compile();

    service = module.get<ExpensesAggregationService>(ExpensesAggregationService);
    categoryPopulator = module.get(CategoryPopulatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSummary', () => {
    it('should calculate summary correctly for multiple expenses', () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'transport' },
        { amount: 75, category: 'entertainment' },
      ];

      const result = service.calculateSummary(expenses);

      expect(result.totalAmount).toBe(225);
      expect(result.totalCount).toBe(3);
      expect(result.averageAmount).toBe(75);
      expect(result.dateRange).toBeDefined();
    });

    it('should return zeros for empty expenses array', () => {
      const result = service.calculateSummary([]);

      expect(result.totalAmount).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.averageAmount).toBe(0);
    });

    it('should handle decimal amounts correctly', () => {
      const expenses = [
        { amount: 10.55 },
        { amount: 20.33 },
        { amount: 15.12 },
      ];

      const result = service.calculateSummary(expenses);

      expect(result.totalAmount).toBe(46);
      expect(result.totalCount).toBe(3);
      expect(result.averageAmount).toBe(15.33);
    });

    it('should round to 2 decimal places', () => {
      const expenses = [
        { amount: 10.555 },
        { amount: 20.333 },
        { amount: 15.111 },
      ];

      const result = service.calculateSummary(expenses);

      expect(result.totalAmount).toBe(46);
    });

    it('should include provided dateRange', () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      const result = service.calculateSummary([], dateRange);

      expect(result.dateRange).toEqual(dateRange);
    });

    it('should handle null dateRange', () => {
      const result = service.calculateSummary([], null);

      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.from).toBeInstanceOf(Date);
      expect(result.dateRange.to).toBeInstanceOf(Date);
    });

    it('should handle expenses without amount property', () => {
      const expenses = [
        { category: 'food' },
        { amount: 50 },
        {},
      ];

      const result = service.calculateSummary(expenses);

      expect(result.totalAmount).toBe(50);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('should calculate breakdown for multiple categories', async () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'food' },
        { amount: 75, category: 'transport' },
        { amount: 25, category: 'entertainment' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        category: 'food',
        total: 150,
        count: 2,
        percentage: 60,
      });
      expect(result[1]).toEqual({
        category: 'transport',
        total: 75,
        count: 1,
        percentage: 30,
      });
      expect(result[2]).toEqual({
        category: 'entertainment',
        total: 25,
        count: 1,
        percentage: 10,
      });
    });

    it('should sort breakdown by total amount descending', async () => {
      const expenses = [
        { amount: 25, category: 'entertainment' },
        { amount: 150, category: 'food' },
        { amount: 75, category: 'transport' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result[0].category).toBe('food');
      expect(result[1].category).toBe('transport');
      expect(result[2].category).toBe('entertainment');
    });

    it('should populate categoryDetails for custom categories', async () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 200, category: 'custom-123' },
      ];

      const populatedExpenses = [
        {
          amount: 0,
          category: 'custom-123',
          categoryDetails: {
            id: 'custom-123',
            name: 'Fitness',
            icon: 'barbell-outline',
            color: '#10B981',
            gradient: '#33C49E',
          },
        },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue(populatedExpenses as any);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result).toHaveLength(2);
      const customCategory = result.find(r => r.category === 'custom-123');
      expect(customCategory?.categoryDetails).toEqual({
        id: 'custom-123',
        name: 'Fitness',
        icon: 'barbell-outline',
        color: '#10B981',
        gradient: '#33C49E',
      });
    });

    it('should not populate categoryDetails for base categories', async () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'transport' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].categoryDetails).toBeUndefined();
      expect(result[1].categoryDetails).toBeUndefined();
      expect(categoryPopulator.populateExpenses).not.toHaveBeenCalled();
    });

    it('should handle empty expenses array', async () => {
      const result = await service.calculateCategoryBreakdown([], 'user-1');

      expect(result).toEqual([]);
      expect(categoryPopulator.populateExpenses).not.toHaveBeenCalled();
    });

    it('should handle expenses without category', async () => {
      const expenses = [
        { amount: 100 },
        { amount: 50, category: 'food' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result).toHaveLength(2);
      const otherCategory = result.find(r => r.category === 'other');
      expect(otherCategory).toBeDefined();
      expect(otherCategory?.total).toBe(100);
    });

    it('should calculate percentage correctly', async () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 200, category: 'transport' },
        { amount: 300, category: 'entertainment' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result[0].percentage).toBe(50); // 300/600
      expect(result[1].percentage).toBe(33.33); // 200/600
      expect(result[2].percentage).toBe(16.67); // 100/600
    });

    it('should handle zero total amount', async () => {
      const expenses = [
        { amount: 0, category: 'food' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result[0].percentage).toBe(0);
    });

    it('should round totals and percentages to 2 decimal places', async () => {
      const expenses = [
        { amount: 10.555, category: 'food' },
        { amount: 20.333, category: 'food' },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue([]);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result[0].total).toBe(30.89);
      expect(result[0].percentage).toBe(100);
    });

    it('should handle multiple custom categories', async () => {
      const expenses = [
        { amount: 100, category: 'custom-123' },
        { amount: 200, category: 'custom-456' },
        { amount: 50, category: 'food' },
      ];

      const populatedExpenses = [
        {
          category: 'custom-123',
          categoryDetails: { id: 'custom-123', name: 'Fitness', icon: 'barbell-outline', color: '#10B981', gradient: '#33C49E' },
        },
        {
          category: 'custom-456',
          categoryDetails: { id: 'custom-456', name: 'Photography', icon: 'camera-outline', color: '#F59E0B', gradient: '#F7B73D' },
        },
      ];

      categoryPopulator.populateExpenses.mockResolvedValue(populatedExpenses as any);

      const result = await service.calculateCategoryBreakdown(expenses, 'user-1');

      expect(result).toHaveLength(3);
      expect(categoryPopulator.populateExpenses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ category: 'custom-123' }),
          expect.objectContaining({ category: 'custom-456' }),
        ]),
        'user-1',
      );

      const fitness = result.find(r => r.category === 'custom-123');
      const photography = result.find(r => r.category === 'custom-456');
      const food = result.find(r => r.category === 'food');

      expect(fitness?.categoryDetails?.name).toBe('Fitness');
      expect(photography?.categoryDetails?.name).toBe('Photography');
      expect(food?.categoryDetails).toBeUndefined();
    });
  });

  describe('calculateDailyTrends', () => {
    it('should calculate daily totals correctly', () => {
      const expenses = [
        { amount: 100, date: new Date('2024-01-15') },
        { amount: 50, date: new Date('2024-01-15') },
        { amount: 75, date: new Date('2024-01-16') },
      ];

      const result = service.calculateDailyTrends(expenses);

      expect(result.dailyTotals).toBeDefined();
      expect(result.dailyTotals['2024-01-15']).toBe(150);
      expect(result.dailyTotals['2024-01-16']).toBe(75);
    });

    it('should return empty object for no expenses', () => {
      const result = service.calculateDailyTrends([]);

      expect(result.dailyTotals).toEqual({});
    });

    it('should handle single expense', () => {
      const expenses = [
        { amount: 100, date: new Date('2024-01-15') },
      ];

      const result = service.calculateDailyTrends(expenses);

      expect(result.dailyTotals['2024-01-15']).toBe(100);
    });

    it('should sort by date ascending', () => {
      const expenses = [
        { amount: 100, date: new Date('2024-01-20') },
        { amount: 50, date: new Date('2024-01-15') },
        { amount: 75, date: new Date('2024-01-18') },
      ];

      const result = service.calculateDailyTrends(expenses);

      const dates = Object.keys(result.dailyTotals).sort();
      expect(dates[0]).toBe('2024-01-15');
      expect(dates[1]).toBe('2024-01-18');
      expect(dates[2]).toBe('2024-01-20');
    });

    it('should round totals to 2 decimal places', () => {
      const expenses = [
        { amount: 10.555, date: new Date('2024-01-15') },
        { amount: 20.333, date: new Date('2024-01-15') },
      ];

      const result = service.calculateDailyTrends(expenses);

      expect(result.dailyTotals['2024-01-15']).toBe(30.89);
    });

    it('should handle expenses without amount', () => {
      const expenses = [
        { date: new Date('2024-01-15') },
        { amount: 50, date: new Date('2024-01-15') },
      ];

      const result = service.calculateDailyTrends(expenses);

      expect(result.dailyTotals['2024-01-15']).toBe(50);
    });
  });
});
