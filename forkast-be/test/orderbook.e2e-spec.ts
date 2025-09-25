import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp } from './test-utils';

describe('OrderbookController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let authToken: string;
    let userId: number;

    beforeEach(async () => {
        process.env.JWT_SECRET = 'testsecret';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        setupTestApp(app);
        prisma = app.get(PrismaService);
        jwtService = app.get(JwtService);
        await app.init();

        // Clean database
        await prisma.trade.deleteMany();
        await prisma.order.deleteMany();
        await prisma.balance.deleteMany();
        await prisma.user.deleteMany();

        // Create test user and get auth token
        const user = await prisma.user.create({
            data: {
                email: 'test@example.com',
                password: 'hashedpassword',
                name: 'Test User',
            },
        });
        userId = user.id;

        // Create JWT token using the JWT service
        authToken = jwtService.sign({ id: userId, email: user.email });
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /orderbook/buy', () => {
        it('should place a limit buy order successfully', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            const response = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.userId).toBe(userId);
            expect(response.body.type).toBe('buy');
            expect(response.body.symbol).toBe('BTC-USD');
            expect(response.body.price).toBe(50000);
            expect(response.body.quantity).toBe(1);
            expect(response.body.market).toBe(false);
            expect(response.body.status).toBe('open');
            expect(response.body.filledQuantity).toBe(0);
        });

        it('should place a market buy order successfully', async () => {
            // First create some market maker inventory
            await prisma.balance.create({
                data: {
                    userId: 0,
                    symbol: 'BTC-USD',
                    amount: 10,
                    locked: 0,
                },
            });

            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: true,
            };

            const response = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.userId).toBe(userId);
            expect(response.body.type).toBe('buy');
            expect(response.body.symbol).toBe('BTC-USD');
            expect(response.body.market).toBe(true);
            expect(response.body.status).toBe('filled');
            expect(response.body.filledQuantity).toBe(1);
        });

        it('should return 401 when no authorization header is provided', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .send(orderData)
                .expect(401);
        });

        it('should return 401 when invalid token is provided', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', 'Bearer invalid-token')
                .send(orderData)
                .expect(401);
        });

        it('should return 400 for unsupported symbol', async () => {
            const orderData = {
                symbol: 'INVALID-SYMBOL',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(400);
        });

        it('should return 400 for insufficient market inventory', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: true,
            };

            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(400);
        });

        it('should return 400 for invalid order data', async () => {
            const invalidOrderData = {
                symbol: 'BTC-USD',
                price: -50000, // Invalid negative price
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidOrderData)
                .expect(400);
        });
    });

    describe('POST /orderbook/sell', () => {
        it('should place a limit sell order successfully', async () => {
            // First create user balance
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC-USD',
                    amount: 10,
                    locked: 0,
                },
            });

            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            const response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.userId).toBe(userId);
            expect(response.body.type).toBe('sell');
            expect(response.body.symbol).toBe('BTC-USD');
            expect(response.body.price).toBe(50000);
            expect(response.body.quantity).toBe(1);
            expect(response.body.market).toBe(false);
            expect(response.body.status).toBe('open');
            expect(response.body.filledQuantity).toBe(0);
        });

        it('should place a market sell order successfully', async () => {
            // First create user balance
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC-USD',
                    amount: 10,
                    locked: 0,
                },
            });

            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: true,
            };

            const response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.userId).toBe(userId);
            expect(response.body.type).toBe('sell');
            expect(response.body.symbol).toBe('BTC-USD');
            expect(response.body.market).toBe(true);
            expect(response.body.status).toBe('filled');
            expect(response.body.filledQuantity).toBe(1);
        });

        it('should return 400 for insufficient balance', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(400);
        });

        it('should return 401 when no authorization header is provided', async () => {
            const orderData = {
                symbol: 'BTC-USD',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/sell')
                .send(orderData)
                .expect(401);
        });

        it('should return 400 for unsupported symbol', async () => {
            const orderData = {
                symbol: 'INVALID-SYMBOL',
                price: 50000,
                quantity: 1,
                market: false,
            };

            await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(400);
        });
    });

    describe('GET /orderbook', () => {
        it('should return orderbook without symbol filter', async () => {
            // Create some test orders
            await prisma.order.createMany({
                data: [
                    {
                        userId,
                        type: 'buy',
                        symbol: 'BTC-USD',
                        price: 50000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                    {
                        userId,
                        type: 'sell',
                        symbol: 'BTC-USD',
                        price: 51000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook')
                .expect(200);

            expect(response.body).toHaveProperty('buys');
            expect(response.body).toHaveProperty('sells');
            expect(Array.isArray(response.body.buys)).toBe(true);
            expect(Array.isArray(response.body.sells)).toBe(true);
        });

        it('should return orderbook with symbol filter', async () => {
            // Create orders for different symbols
            await prisma.order.createMany({
                data: [
                    {
                        userId,
                        type: 'buy',
                        symbol: 'BTC-USD',
                        price: 50000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                    {
                        userId,
                        type: 'buy',
                        symbol: 'ETH-USD',
                        price: 3000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook?symbol=BTC-USD')
                .expect(200);

            expect(response.body).toHaveProperty('buys');
            expect(response.body).toHaveProperty('sells');
            expect(response.body.buys).toHaveLength(1);
            expect(response.body.buys[0].symbol).toBe('BTC-USD');
        });

        it('should return empty orderbook when no orders exist', async () => {
            const response = await request(app.getHttpServer())
                .get('/orderbook')
                .expect(200);

            expect(response.body).toEqual({ buys: [], sells: [] });
        });
    });

    describe('GET /orderbook/trades', () => {
        it('should return trade history for authenticated user', async () => {
            // Create some test trades
            await prisma.trade.createMany({
                data: [
                    {
                        buyOrderId: 1,
                        sellOrderId: 2,
                        price: 50000,
                        quantity: 1,
                        buyerUserId: userId,
                        sellerUserId: 0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook/trades')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 401 when no authorization header is provided', async () => {
            await request(app.getHttpServer())
                .get('/orderbook/trades')
                .expect(401);
        });

        it('should return empty array when no trades exist', async () => {
            const response = await request(app.getHttpServer())
                .get('/orderbook/trades')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });
    });

    describe('GET /orderbook/my-orders', () => {
        it('should return user orders without query parameters', async () => {
            // Create some test orders
            await prisma.order.createMany({
                data: [
                    {
                        userId,
                        type: 'buy',
                        symbol: 'BTC-USD',
                        price: 50000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                    {
                        userId,
                        type: 'sell',
                        symbol: 'BTC-USD',
                        price: 51000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook/my-orders')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
        });

        it('should return user orders with query parameters', async () => {
            // Create orders for different symbols and types
            await prisma.order.createMany({
                data: [
                    {
                        userId,
                        type: 'buy',
                        symbol: 'BTC-USD',
                        price: 50000,
                        quantity: 1,
                        status: 'open',
                        filledQuantity: 0,
                    },
                    {
                        userId,
                        type: 'sell',
                        symbol: 'ETH-USD',
                        price: 3000,
                        quantity: 1,
                        status: 'filled',
                        filledQuantity: 1,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook/my-orders?symbol=BTC-USD&side=buy&status=open')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].symbol).toBe('BTC-USD');
            expect(response.body[0].type).toBe('buy');
            expect(response.body[0].status).toBe('open');
        });

        it('should return 401 when no authorization header is provided', async () => {
            await request(app.getHttpServer())
                .get('/orderbook/my-orders')
                .expect(401);
        });

        it('should return empty array when no orders exist', async () => {
            const response = await request(app.getHttpServer())
                .get('/orderbook/my-orders')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should handle pagination parameters', async () => {
            // Create multiple orders
            await prisma.order.createMany({
                data: Array.from({ length: 5 }, (_, i) => ({
                    userId,
                    type: 'buy',
                    symbol: 'BTC-USD',
                    price: 50000 + i,
                    quantity: 1,
                    status: 'open',
                    filledQuantity: 0,
                })),
            });

            const response = await request(app.getHttpServer())
                .get('/orderbook/my-orders?limit=3&offset=0')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(3);
        });
    });
});
