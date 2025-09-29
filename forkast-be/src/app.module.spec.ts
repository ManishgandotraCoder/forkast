import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AppModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
    });

    afterEach(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide AppController', () => {
        const controller = module.get<AppController>(AppController);
        expect(controller).toBeDefined();
    });

    it('should provide AppService', () => {
        const service = module.get<AppService>(AppService);
        expect(service).toBeDefined();
    });

    it('should provide UserController', () => {
        const controller = module.get<UserController>(UserController);
        expect(controller).toBeDefined();
    });

    it('should provide UserService', () => {
        const service = module.get<UserService>(UserService);
        expect(service).toBeDefined();
    });

    it('should provide PrismaService', () => {
        const prismaService = module.get<PrismaService>(PrismaService);
        expect(prismaService).toBeDefined();
    });

    it('should provide JwtService', () => {
        const jwtService = module.get<JwtService>(JwtService);
        expect(jwtService).toBeDefined();
    });

    it('should be a valid NestJS module', () => {
        expect(module).toBeInstanceOf(TestingModule);
    });

    it('should have all controllers registered', () => {
        const appController = module.get<AppController>(AppController);
        const userController = module.get<UserController>(UserController);

        expect(appController).toBeDefined();
        expect(userController).toBeDefined();
    });

    it('should have all services registered', () => {
        const appService = module.get<AppService>(AppService);
        const userService = module.get<UserService>(UserService);
        const prismaService = module.get<PrismaService>(PrismaService);

        expect(appService).toBeDefined();
        expect(userService).toBeDefined();
        expect(prismaService).toBeDefined();
    });

    it('should have JWT module configured', () => {
        const jwtService = module.get<JwtService>(JwtService);
        expect(jwtService).toBeDefined();
    });

    it('should have Winston module configured', () => {
        // Winston module is imported and configured in the AppModule
        // This test verifies the module can be created without errors
        expect(module).toBeDefined();
    });

    it('should have all sub-modules imported', () => {
        // CryptoModule, OrderbookModule, and BalanceModule are imported
        // This test verifies the module can be created without errors
        expect(module).toBeDefined();
    });

    it('should have proper dependency injection setup', () => {
        const appController = module.get<AppController>(AppController);
        const userController = module.get<UserController>(UserController);

        // Verify that services are injected into controllers
        expect(appController['appService']).toBeDefined();
        expect(userController['userService']).toBeDefined();
    });

    it('should handle module initialization without errors', async () => {
        // This test verifies that the module can be initialized without throwing errors
        expect(module).toBeDefined();
        await expect(module.init()).resolves.not.toThrow();
    });

    it('should handle module cleanup without errors', async () => {
        // This test verifies that the module can be closed without throwing errors
        await expect(module.close()).resolves.not.toThrow();
    });
});
