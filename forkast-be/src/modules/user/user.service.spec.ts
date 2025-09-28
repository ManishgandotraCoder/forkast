import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('UserService', () => {
    let service: UserService;
    let prismaService: PrismaService;
    let jwtService: JwtService;

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        balance: {
            create: jest.fn(),
        },
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        prismaService = module.get<PrismaService>(PrismaService);
        jwtService = module.get<JwtService>(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            const mockBalance = {
                id: 1,
                userId: 1,
                symbol: 'USD',
                amount: 10000,
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.user.create.mockResolvedValue(mockUser);
            mockPrismaService.balance.create.mockResolvedValue(mockBalance);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

            const result = await service.register(registerData);

            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: registerData.email },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
            expect(mockPrismaService.user.create).toHaveBeenCalledWith({
                data: {
                    email: registerData.email,
                    password: 'hashedpassword',
                    name: registerData.name,
                },
            });
            expect(mockPrismaService.balance.create).toHaveBeenCalledWith({
                data: {
                    userId: 1,
                    symbol: 'USD',
                    amount: 10000,
                },
            });
            expect(result).toEqual({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            });
        });

        it('should throw error if user already exists', async () => {
            const registerData = {
                email: 'existing@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const existingUser = {
                id: 1,
                email: 'existing@example.com',
                password: 'hashedpassword',
                name: 'Existing User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

            await expect(service.register(registerData)).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
        });

        it('should handle database errors during user creation', async () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
            mockPrismaService.user.create.mockRejectedValue(new Error('Database error'));

            await expect(service.register(registerData)).rejects.toThrow('Database error');
        });

        it('should handle database errors during balance creation', async () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.user.create.mockResolvedValue(mockUser);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
            mockPrismaService.balance.create.mockRejectedValue(new Error('Balance creation failed'));

            await expect(service.register(registerData)).rejects.toThrow('Balance creation failed');
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.sign.mockReturnValue('jwt-token');

            const result = await service.login(loginData);

            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: loginData.email },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                id: mockUser.id,
                email: mockUser.email,
            });
            expect(result).toEqual({
                access_token: 'jwt-token',
                name: 'Test User',
                email: 'test@example.com',
            });
        });

        it('should throw error if user does not exist', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.login(loginData)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw error if password is incorrect', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginData)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockJwtService.sign).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };

            mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

            await expect(service.login(loginData)).rejects.toThrow('Database error');
        });

        it('should handle bcrypt errors', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

            await expect(service.login(loginData)).rejects.toThrow('Bcrypt error');
        });
    });

    describe('profile', () => {
        it('should return user profile successfully', async () => {
            const userId = 1;
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.profile(userId);

            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { id: userId },
            });
            expect(result).toEqual({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            });
        });

        it('should throw error if user not found', async () => {
            const userId = 999;

            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.profile(userId)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should handle database errors', async () => {
            const userId = 1;

            mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

            await expect(service.profile(userId)).rejects.toThrow('Database error');
        });

        it('should handle edge cases with different user IDs', async () => {
            const userId = 0; // Edge case: user ID 0
            const mockUser = {
                id: 0,
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
                createdAt: new Date(),
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.profile(userId);

            expect(result).toEqual({
                id: 0,
                email: 'test@example.com',
                name: 'Test User',
            });
        });
    });
});
