import { Test, TestingModule } from '@nestjs/testing';
import { LiscenseController } from './liscense.controller';

describe('LiscenseController', () => {
  let controller: LiscenseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiscenseController],
    }).compile();

    controller = module.get<LiscenseController>(LiscenseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
