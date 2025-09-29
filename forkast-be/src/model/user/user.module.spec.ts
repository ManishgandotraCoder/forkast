import { Test, TestingModule } from '@nestjs/testing';
import { UserModule } from './user.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('UserModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [UserModule],
        }).compile();
    });

    afterEach(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
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

    it('should have all required dependencies injected', () => {
        const controller = module.get<UserController>(UserController);
        const service = module.get<UserService>(UserService);

        expect(controller).toBeDefined();
        expect(service).toBeDefined();

        // Verify that the service is injected into the controller
        expect(controller['userService']).toBeDefined();
    });

    it('should have JWT module configured', () => {
        // JWT module is imported and configured in the UserModule
        // This test verifies the module can be created without errors
        expect(module).toBeDefined();
    });
});
