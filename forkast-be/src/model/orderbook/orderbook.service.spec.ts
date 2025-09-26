import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookService } from './orderbook.service';
import { PrismaService } from '../../prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('OrderbookService', () => {
    let service: OrderbookService;
    let prismaService: PrismaService;

    const mockPrismaService = {
        $transaction: jest.fn(),
        order: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        balance: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
        },
        trade: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderbookService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<OrderbookService>(OrderbookService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('buyOrder', () => {
        it('should create a limit buy order successfully', async () => {
            const mockOrder = {
                id: 1,
                userId: 1,
                type: 'buy',
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
                status: 'open',
                filledQuantity: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue(mockOrder),
                        findMany: jest.fn().mockResolvedValue([]),
                        update: jest.fn().mockResolvedValue(mockOrder),
                    },
                    balance: {
                        findUnique: jest.fn(),
                        upsert: jest.fn(),
                        update: jest.fn(),
                    },
                    trade: {
                        create: jest.fn(),
                    },
                });
            });

            const result = await service.buyOrder(1, 'BTC-USD', 50000, 1, false);

            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockOrder);
        });

        it('should create a market buy order successfully', async () => {
            const mockOrder = {
                id: 1,
                userId: 1,
                type: 'buy',
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: true,
                status: 'filled',
                filledQuantity: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockBalance = {
                id: 1,
                userId: 0,
                symbol: 'BTC-USD',
                amount: 10,
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue(mockOrder),
                        update: jest.fn().mockResolvedValue(mockOrder),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(mockBalance),
                        upsert: jest.fn(),
                        update: jest.fn(),
                    },
                    trade: {
                        create: jest.fn(),
                    },
                });
            });

            const result = await service.buyOrder(1, 'BTC-USD', 50000, 1, true);

            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockOrder);
        });

        it('should throw error for unsupported symbol', async () => {
            await expect(service.buyOrder(1, 'INVALID-SYMBOL', 50000, 1, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw error for insufficient market inventory', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue({
                            id: 1,
                            userId: 1,
                            type: 'buy',
                            symbol: 'BTC-USD',
                            price: 50000,
                            quantity: 1,
                            market: true,
                            status: 'open',
                            filledQuantity: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(null), // No market maker balance
                    },
                });
            });

            await expect(service.buyOrder(1, 'BTC-USD', 50000, 1, true)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            mockPrismaService.$transaction.mockRejectedValue(dbError);

            await expect(service.buyOrder(1, 'BTC-USD', 50000, 1, false)).rejects.toThrow(
                'Database connection failed',
            );
        });
    });

    describe('sellOrder', () => {
        it('should create a limit sell order successfully', async () => {
            const mockOrder = {
                id: 1,
                userId: 1,
                type: 'sell',
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
                status: 'open',
                filledQuantity: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockBalance = {
                id: 1,
                userId: 1,
                symbol: 'BTC-USD',
                amount: 10,
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue(mockOrder),
                        findMany: jest.fn().mockResolvedValue([]),
                        update: jest.fn().mockResolvedValue(mockOrder),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(mockBalance),
                        upsert: jest.fn(),
                        update: jest.fn(),
                    },
                    trade: {
                        create: jest.fn(),
                    },
                });
            });

            const result = await service.sellOrder(1, 'BTC-USD', 50000, 1, false);

            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockOrder);
        });

        it('should create a market sell order successfully', async () => {
            const mockOrder = {
                id: 1,
                userId: 1,
                type: 'sell',
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: true,
                status: 'filled',
                filledQuantity: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockBalance = {
                id: 1,
                userId: 1,
                symbol: 'BTC-USD',
                amount: 10,
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue(mockOrder),
                        update: jest.fn().mockResolvedValue(mockOrder),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(mockBalance),
                        upsert: jest.fn(),
                        update: jest.fn(),
                    },
                    trade: {
                        create: jest.fn(),
                    },
                });
            });

            const result = await service.sellOrder(1, 'BTC-USD', 50000, 1, true);

            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(result).toEqual(mockOrder);
        });

        it('should throw error for unsupported symbol', async () => {
            await expect(service.sellOrder(1, 'INVALID-SYMBOL', 50000, 1, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw error for insufficient balance', async () => {
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue({
                            id: 1,
                            userId: 1,
                            type: 'sell',
                            symbol: 'BTC-USD',
                            price: 50000,
                            quantity: 1,
                            market: false,
                            status: 'open',
                            filledQuantity: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(null), // No balance
                    },
                });
            });

            await expect(service.sellOrder(1, 'BTC-USD', 50000, 1, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw error when balance is less than required quantity', async () => {
            const mockBalance = {
                id: 1,
                userId: 1,
                symbol: 'BTC-USD',
                amount: 0.5, // Less than required 1
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback({
                    order: {
                        create: jest.fn().mockResolvedValue({
                            id: 1,
                            userId: 1,
                            type: 'sell',
                            symbol: 'BTC-USD',
                            price: 50000,
                            quantity: 1,
                            market: false,
                            status: 'open',
                            filledQuantity: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }),
                    },
                    balance: {
                        findUnique: jest.fn().mockResolvedValue(mockBalance),
                    },
                });
            });

            await expect(service.sellOrder(1, 'BTC-USD', 50000, 1, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            mockPrismaService.$transaction.mockRejectedValue(dbError);

            await expect(service.sellOrder(1, 'BTC-USD', 50000, 1, false)).rejects.toThrow(
                'Database connection failed',
            );
        });
    });

    describe('getOrderbook', () => {
        it('should return orderbook without symbol filter', async () => {
            const mockBuys = [
                {
                    id: 1,
                    userId: 1,
                    type: 'buy',
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    status: 'open',
                    filledQuantity: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    user: { id: 1, name: 'User 1' },
                },
            ];

            const mockSells = [
                {
                    id: 2,
                    userId: 2,
                    type: 'sell',
                    symbol: 'BTC-USD',
                    price: 51000,
                    quantity: 1,
                    status: 'open',
                    filledQuantity: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    user: { id: 2, name: 'User 2' },
                },
            ];

            mockPrismaService.order.findMany
                .mockResolvedValueOnce(mockBuys)
                .mockResolvedValueOnce(mockSells);

            const result = await service.getOrderbook();

            expect(mockPrismaService.order.findMany).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ buys: mockBuys, sells: mockSells });
        });

        it('should return orderbook with symbol filter', async () => {
            const mockBuys = [];
            const mockSells = [];

            mockPrismaService.order.findMany
                .mockResolvedValueOnce(mockBuys)
                .mockResolvedValueOnce(mockSells);

            const result = await service.getOrderbook('BTC-USD');

            expect(mockPrismaService.order.findMany).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ buys: mockBuys, sells: mockSells });
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            mockPrismaService.order.findMany.mockRejectedValue(dbError);

            await expect(service.getOrderbook()).rejects.toThrow('Database connection failed');
        });
    });

    describe('getTradeHistory', () => {
        it('should return trade history for specific user', async () => {
            const mockTrades = [
                {
                    id: 1,
                    buyOrderId: 1,
                    sellOrderId: 2,
                    price: 50000,
                    quantity: 1,
                    executedAt: new Date(),
                    buyerUserId: 1,
                    sellerUserId: 2,
                },
            ];

            mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

            const result = await service.getTradeHistory(1);

            expect(mockPrismaService.trade.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { buyOrder: { userId: 1 } },
                        { sellOrder: { userId: 1 } },
                    ],
                },
                orderBy: { executedAt: 'desc' },
            });
            expect(result).toEqual(mockTrades);
        });

        it('should return all trade history when no user specified', async () => {
            const mockTrades = [
                {
                    id: 1,
                    buyOrderId: 1,
                    sellOrderId: 2,
                    price: 50000,
                    quantity: 1,
                    executedAt: new Date(),
                    buyerUserId: 1,
                    sellerUserId: 2,
                },
            ];

            mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

            const result = await service.getTradeHistory();

            expect(mockPrismaService.trade.findMany).toHaveBeenCalledWith({
                where: {},
                orderBy: { executedAt: 'desc' },
            });
            expect(result).toEqual(mockTrades);
        });

        it('should return empty array when no trades', async () => {
            mockPrismaService.trade.findMany.mockResolvedValue([]);

            const result = await service.getTradeHistory(1);

            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            mockPrismaService.trade.findMany.mockRejectedValue(dbError);

            await expect(service.getTradeHistory(1)).rejects.toThrow('Database connection failed');
        });
    });

    describe('getMyOrders', () => {
        it('should return user orders without filters', async () => {
            const mockOrders = [
                {
                    id: 1,
                    userId: 1,
                    type: 'buy',
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    status: 'open',
                    filledQuantity: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

            const result = await service.getMyOrders(1, {});

            expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
                where: { userId: 1 },
                orderBy: { createdAt: 'desc' },
                take: undefined,
                skip: undefined,
            });
            expect(result).toEqual(mockOrders);
        });

        it('should return user orders with filters', async () => {
            const mockOrders = [
                {
                    id: 1,
                    userId: 1,
                    type: 'buy',
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    status: 'open',
                    filledQuantity: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            const query = {
                symbol: 'BTC-USD',
                side: 'buy',
                status: 'open',
                limit: '10',
                offset: '0',
            };

            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

            const result = await service.getMyOrders(1, query);

            expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 1,
                    symbol: 'BTC-USD',
                    type: 'buy',
                    status: 'open',
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                skip: 0,
            });
            expect(result).toEqual(mockOrders);
        });

        it('should return empty array when no orders', async () => {
            mockPrismaService.order.findMany.mockResolvedValue([]);

            const result = await service.getMyOrders(1, {});

            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            mockPrismaService.order.findMany.mockRejectedValue(dbError);

            await expect(service.getMyOrders(1, {})).rejects.toThrow('Database connection failed');
        });
    });
});
