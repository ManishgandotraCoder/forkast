import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookModule } from './orderbook.module';
import { OrderbookController } from './orderbook.controller';
import { OrderbookService } from './orderbook.service';
import { PrismaService } from '../../prisma.service';

describe('OrderbookModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [OrderbookModule],
        }).compile();
    });

    afterEach(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide OrderbookController', () => {
        const controller = module.get<OrderbookController>(OrderbookController);
        expect(controller).toBeDefined();
    });

    it('should provide OrderbookService', () => {
        const service = module.get<OrderbookService>(OrderbookService);
        expect(service).toBeDefined();
    });

    it('should provide PrismaService', () => {
        const prismaService = module.get<PrismaService>(PrismaService);
        expect(prismaService).toBeDefined();
    });

    it('should be properly configured', () => {
        // Module should be created without errors
        expect(module).toBeDefined();
    });

    it('should be a valid NestJS module', () => {
        expect(module).toBeInstanceOf(TestingModule);
    });
});
