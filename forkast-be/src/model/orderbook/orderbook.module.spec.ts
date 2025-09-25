import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookModule } from './orderbook.module';
import { OrderbookController } from './orderbook.controller';
import { OrderbookRefactoredService } from './orderbook-refactored.service';
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

    it('should provide OrderbookRefactoredService', () => {
        const service = module.get<OrderbookRefactoredService>(OrderbookRefactoredService);
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
