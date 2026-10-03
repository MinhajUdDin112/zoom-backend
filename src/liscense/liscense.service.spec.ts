import { Test, TestingModule } from '@nestjs/testing';
import { LiscenseService } from './liscense.service';

describe('LiscenseService', () => {
  let service: LiscenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiscenseService],
    }).compile();

    service = module.get<LiscenseService>(LiscenseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
