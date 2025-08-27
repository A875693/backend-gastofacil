import { Test, TestingModule } from '@nestjs/testing';
import { SavingsGoalsService } from './savings-goals.service';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavingsGoalsService],
    }).compile();

    service = module.get<SavingsGoalsService>(SavingsGoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
