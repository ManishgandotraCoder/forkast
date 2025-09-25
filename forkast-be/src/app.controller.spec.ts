import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockAppService = {
    getHello: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return hello message from service', () => {
      const expectedMessage = 'Hello World!';
      mockAppService.getHello.mockReturnValue(expectedMessage);

      const result = controller.getHello();

      expect(mockAppService.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });

    it('should handle service errors', () => {
      const error = new Error('Service error');
      mockAppService.getHello.mockImplementation(() => {
        throw error;
      });

      expect(() => controller.getHello()).toThrow('Service error');
    });
  });
});