import { Test, TestingModule } from '@nestjs/testing';
import { CryptoModule } from './crypto.module';
import { CryptoController } from './crypto.controller';

describe('CryptoModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CryptoModule],
        }).compile();
    });

    afterEach(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide CryptoController', () => {
        const controller = module.get<CryptoController>(CryptoController);
        expect(controller).toBeDefined();
    });

    it('should have CryptoController as a controller', () => {
        const controller = module.get<CryptoController>(CryptoController);
        expect(controller).toBeDefined();
    });

    it('should be a valid NestJS module', () => {
        expect(module).toBeInstanceOf(TestingModule);
    });
});
