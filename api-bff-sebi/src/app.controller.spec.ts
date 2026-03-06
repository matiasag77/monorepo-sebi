import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return service status', () => {
    expect(appController.getStatus()).toEqual({
      service: 'api-bff-sebi',
      status: 'ok',
      mode: 'mock-ai-responses',
    });
  });

  it('should return mock ai reply', () => {
    expect(appController.getMockReply('ventas q4').source).toBe('mock');
  });
});
