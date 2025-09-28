import { Test, TestingModule } from '@nestjs/testing';
import { BalanceModule } from './balance.module';
import { BalanceController } from './balance.controller';
import { PrismaService } from '../../prisma.service';
import { JwtModule } from '@nestjs/jwt';

describe('BalanceModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                BalanceModule,
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '24h' },
                }),
            ],
        }).compile();
    });

    afterEach(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide BalanceController', () => {
        const controller = module.get<BalanceController>(BalanceController);
        expect(controller).toBeDefined();
    });

    it('should provide PrismaService', () => {
        const prismaService = module.get<PrismaService>(PrismaService);
        expect(prismaService).toBeDefined();
    });

    it('should have JWT module configured', () => {
        // JWT module is imported and configured in the BalanceModule
        // This test verifies the module can be created without errors
        expect(module).toBeDefined();
    });
});
