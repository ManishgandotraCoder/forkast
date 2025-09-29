import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from './balance.controller';
import { PrismaService } from '../../prisma.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('BalanceController', () => {
    let controller: BalanceController;
    let prismaService: PrismaService;

    const mockPrismaService = {
        balance: {
            findMany: jest.fn(),
        },
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn(() => true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BalanceController],
            providers: [
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: JwtService,
                    useValue: {},
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<BalanceController>(BalanceController);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getBalances', () => {
        it('should return formatted balances for authenticated user', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockBalances = [
                {
                    id: 1,
                    userId: 1,
                    symbol: 'BTC',
                    amount: 100.5,
                    locked: 10.0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    userId: 1,
                    symbol: 'ETH',
                    amount: 50.0,
                    locked: 5.0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.balance.findMany.mockResolvedValue(mockBalances);

            const result = await controller.getBalances(mockRequest);

            expect(mockPrismaService.balance.findMany).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
            });

            expect(result).toEqual([
                {
                    asset: 'BTC',
                    available: 90.5, // 100.5 - 10.0
                    locked: 10.0,
                    total: 100.5,
                },
                {
                    asset: 'ETH',
                    available: 45.0, // 50.0 - 5.0
                    locked: 5.0,
                    total: 50.0,
                },
            ]);
        });

        it('should return empty array when user has no balances', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };

            mockPrismaService.balance.findMany.mockResolvedValue([]);

            const result = await controller.getBalances(mockRequest);

            expect(mockPrismaService.balance.findMany).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
            });

            expect(result).toEqual([]);
        });

        it('should handle zero amounts correctly', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockBalances = [
                {
                    id: 1,
                    userId: 1,
                    symbol: 'BTC',
                    amount: 0,
                    locked: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.balance.findMany.mockResolvedValue(mockBalances);

            const result = await controller.getBalances(mockRequest);

            expect(result).toEqual([
                {
                    asset: 'BTC',
                    available: 0, // 0 - 0
                    locked: 0,
                    total: 0,
                },
            ]);
        });

        it('should handle case where locked amount equals total amount', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockBalances = [
                {
                    id: 1,
                    userId: 1,
                    symbol: 'BTC',
                    amount: 100.0,
                    locked: 100.0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.balance.findMany.mockResolvedValue(mockBalances);

            const result = await controller.getBalances(mockRequest);

            expect(result).toEqual([
                {
                    asset: 'BTC',
                    available: 0, // 100.0 - 100.0
                    locked: 100.0,
                    total: 100.0,
                },
            ]);
        });

        it('should handle case where locked amount is greater than total amount', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockBalances = [
                {
                    id: 1,
                    userId: 1,
                    symbol: 'BTC',
                    amount: 50.0,
                    locked: 75.0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.balance.findMany.mockResolvedValue(mockBalances);

            const result = await controller.getBalances(mockRequest);

            expect(result).toEqual([
                {
                    asset: 'BTC',
                    available: -25.0, // 50.0 - 75.0
                    locked: 75.0,
                    total: 50.0,
                },
            ]);
        });

        it('should handle decimal precision correctly', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockBalances = [
                {
                    id: 1,
                    userId: 1,
                    symbol: 'BTC',
                    amount: 0.123456789,
                    locked: 0.012345678,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.balance.findMany.mockResolvedValue(mockBalances);

            const result = await controller.getBalances(mockRequest);

            expect(result).toEqual([
                {
                    asset: 'BTC',
                    available: 0.111111111, // 0.123456789 - 0.012345678
                    locked: 0.012345678,
                    total: 0.123456789,
                },
            ]);
        });

        it('should propagate database errors', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const dbError = new Error('Database connection failed');

            mockPrismaService.balance.findMany.mockRejectedValue(dbError);

            await expect(controller.getBalances(mockRequest)).rejects.toThrow('Database connection failed');
        });
    });
});
