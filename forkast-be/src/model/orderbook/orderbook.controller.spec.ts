import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookController } from './orderbook.controller';
import { OrderbookRefactoredService } from './orderbook-refactored.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('OrderbookController', () => {
    let controller: OrderbookController;
    let orderbookService: OrderbookRefactoredService;

    const mockOrderbookService = {
        placeOrder: jest.fn(),
        getOrderbook: jest.fn(),
        getTradeHistory: jest.fn(),
        getMyOrders: jest.fn(),
    };

    const mockJwtAuthGuard = {
        canActivate: jest.fn(() => true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderbookController],
            providers: [
                {
                    provide: OrderbookRefactoredService,
                    useValue: mockOrderbookService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<OrderbookController>(OrderbookController);
        orderbookService = module.get<OrderbookRefactoredService>(OrderbookRefactoredService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('placeBuyOrder', () => {
        it('should place a buy order successfully', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
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

            const placeOrderDto = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            mockOrderbookService.placeOrder.mockResolvedValue(mockOrder);

            const result = await controller.placeBuyOrder(placeOrderDto, mockRequest);

            expect(mockOrderbookService.placeOrder).toHaveBeenCalledWith(
                1,
                'buy',
                'BTC-USD',
                50000,
                1,
                false,
            );
            expect(result).toEqual(mockOrder);
        });

        it('should handle service errors', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const placeOrderDto = {
                symbol: 'INVALID-SYMBOL',
                price: 50000,
                quantity: 1,
                market: false,
            };

            const error = new BadRequestException('Symbol not supported');
            mockOrderbookService.placeOrder.mockRejectedValue(error);

            await expect(controller.placeBuyOrder(placeOrderDto, mockRequest)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('placeSellOrder', () => {
        it('should place a sell order successfully', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
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

            const placeOrderDto = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            mockOrderbookService.placeOrder.mockResolvedValue(mockOrder);

            const result = await controller.placeSellOrder(placeOrderDto, mockRequest);

            expect(mockOrderbookService.placeOrder).toHaveBeenCalledWith(
                1,
                'sell',
                'BTC-USD',
                50000,
                1,
                false,
            );
            expect(result).toEqual(mockOrder);
        });
    });

    describe('getOrderbook', () => {
        it('should return orderbook', async () => {
            const mockOrderbook = {
                buys: [],
                sells: [],
            };

            mockOrderbookService.getOrderbook.mockResolvedValue(mockOrderbook);

            const result = await controller.getOrderbook();

            expect(mockOrderbookService.getOrderbook).toHaveBeenCalledWith(undefined);
            expect(result).toEqual(mockOrderbook);
        });
    });

    describe('getTradeHistory', () => {
        it('should return trade history for authenticated user', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockTrades = [];

            mockOrderbookService.getTradeHistory.mockResolvedValue(mockTrades);

            const result = await controller.getTradeHistory(mockRequest);

            expect(mockOrderbookService.getTradeHistory).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockTrades);
        });
    });

    describe('getMyOrders', () => {
        it('should return user orders', async () => {
            const mockUser = { id: 1 };
            const mockRequest = { user: mockUser };
            const mockOrders = [];

            mockOrderbookService.getMyOrders.mockResolvedValue(mockOrders);

            const result = await controller.getMyOrders(mockRequest, {});

            expect(mockOrderbookService.getMyOrders).toHaveBeenCalledWith(1, {});
            expect(result).toEqual(mockOrders);
        });
    });
});