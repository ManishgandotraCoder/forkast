import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp } from './test-utils';

describe('Orderbook Matching Logic (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let user1Token: string;
    let user2Token: string;
    let user1Id: number;
    let user2Id: number;

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

        // Create test users
        const user1 = await prisma.user.create({
            data: {
                email: 'user1@example.com',
                password: 'hashedpassword',
                name: 'User 1',
            },
        });
        user1Id = user1.id;

        const user2 = await prisma.user.create({
            data: {
                email: 'user2@example.com',
                password: 'hashedpassword',
                name: 'User 2',
            },
        });
        user2Id = user2.id;

        // Create JWT tokens
        user1Token = jwtService.sign({ id: user1Id, email: user1.email });
        user2Token = jwtService.sign({ id: user2Id, email: user2.email });
    });

    afterEach(async () => {
        await app.close();
    });

    describe('Order Matching Scenarios', () => {
        it('should match buy and sell orders at the same price', async () => {
            // Create balances for both users
            await prisma.balance.createMany({
                data: [
                    {
                        userId: user1Id,
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user2Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // User 1 places a sell order
            const sellResponse = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: false,
                })
                .expect(201);

            // User 2 places a buy order at the same price
            const buyResponse = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: false,
                })
                .expect(201);

            // Check that both orders are filled
            expect(sellResponse.body.status).toBe('filled');
            expect(sellResponse.body.filledQuantity).toBe(1);
            expect(buyResponse.body.status).toBe('filled');
            expect(buyResponse.body.filledQuantity).toBe(1);

            // Check that a trade was created
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(1);
            expect(trades[0].price).toBe(50000);
            expect(trades[0].quantity).toBe(1);
            expect(trades[0].buyerUserId).toBe(user2Id);
            expect(trades[0].sellerUserId).toBe(user1Id);

            // Check balance updates
            const user1Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user1Id, symbol: 'BTC-USD' } },
            });
            const user2Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user2Id, symbol: 'BTC-USD' } },
            });

            expect(user1Balance?.amount).toBe(9); // 10 - 1
            expect(user2Balance?.amount).toBe(1); // 0 + 1
        });

        it('should match partial orders correctly', async () => {
            // Create balances
            await prisma.balance.createMany({
                data: [
                    {
                        userId: user1Id,
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user2Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // User 1 places a sell order for 5 BTC
            const sellResponse = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 5,
                    market: false,
                })
                .expect(201);

            // User 2 places a buy order for 3 BTC at the same price
            const buyResponse = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 3,
                    market: false,
                })
                .expect(201);

            // Check that buy order is filled, sell order is partially filled
            expect(buyResponse.body.status).toBe('filled');
            expect(buyResponse.body.filledQuantity).toBe(3);
            expect(sellResponse.body.status).toBe('open');
            expect(sellResponse.body.filledQuantity).toBe(3);

            // Check that a trade was created
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(1);
            expect(trades[0].quantity).toBe(3);

            // Check balance updates
            const user1Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user1Id, symbol: 'BTC-USD' } },
            });
            const user2Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user2Id, symbol: 'BTC-USD' } },
            });

            expect(user1Balance?.amount).toBe(7); // 10 - 3
            expect(user2Balance?.amount).toBe(3); // 0 + 3
        });

        it('should not match orders at different prices', async () => {
            // Create balances
            await prisma.balance.createMany({
                data: [
                    {
                        userId: user1Id,
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user2Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // User 1 places a sell order at 50000
            const sellResponse = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: false,
                })
                .expect(201);

            // User 2 places a buy order at 49000 (lower price)
            const buyResponse = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 49000,
                    quantity: 1,
                    market: false,
                })
                .expect(201);

            // Check that both orders remain open
            expect(sellResponse.body.status).toBe('open');
            expect(sellResponse.body.filledQuantity).toBe(0);
            expect(buyResponse.body.status).toBe('open');
            expect(buyResponse.body.filledQuantity).toBe(0);

            // Check that no trades were created
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(0);
        });

        it('should handle market orders correctly', async () => {
            // Create balances including market maker inventory
            await prisma.balance.createMany({
                data: [
                    {
                        userId: 0, // Market maker
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user1Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // User 1 places a market buy order
            const buyResponse = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 2,
                    market: true,
                })
                .expect(201);

            // Check that the order is filled
            expect(buyResponse.body.status).toBe('filled');
            expect(buyResponse.body.filledQuantity).toBe(2);

            // Check that a trade was created with market maker
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(1);
            expect(trades[0].buyerUserId).toBe(user1Id);
            expect(trades[0].sellerUserId).toBe(0); // Market maker

            // Check balance updates
            const user1Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user1Id, symbol: 'BTC-USD' } },
            });
            const mmBalance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: 0, symbol: 'BTC-USD' } },
            });

            expect(user1Balance?.amount).toBe(2); // 0 + 2
            expect(mmBalance?.amount).toBe(8); // 10 - 2
        });

        it('should handle multiple matching orders in correct order', async () => {
            // Create balances
            await prisma.balance.createMany({
                data: [
                    {
                        userId: user1Id,
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user2Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // Create multiple sell orders at different prices
            const sell1Response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 2,
                    market: false,
                })
                .expect(201);

            const sell2Response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 51000,
                    quantity: 2,
                    market: false,
                })
                .expect(201);

            // User 2 places a buy order that should match the first sell order
            const buyResponse = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 2,
                    market: false,
                })
                .expect(201);

            // Check that the buy order is filled and only the first sell order is matched
            expect(buyResponse.body.status).toBe('filled');
            expect(buyResponse.body.filledQuantity).toBe(2);
            expect(sell1Response.body.status).toBe('filled');
            expect(sell1Response.body.filledQuantity).toBe(2);
            expect(sell2Response.body.status).toBe('open');
            expect(sell2Response.body.filledQuantity).toBe(0);

            // Check that only one trade was created
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(1);
            expect(trades[0].price).toBe(50000);
        });

        it('should handle insufficient balance for sell orders', async () => {
            // Create insufficient balance for user 1
            await prisma.balance.create({
                data: {
                    userId: user1Id,
                    symbol: 'BTC-USD',
                    amount: 0.5, // Less than required 1
                    locked: 0,
                },
            });

            // User 1 tries to place a sell order
            await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: false,
                })
                .expect(400);
        });

        it('should handle insufficient market maker inventory for buy orders', async () => {
            // Create insufficient market maker inventory
            await prisma.balance.create({
                data: {
                    userId: 0,
                    symbol: 'BTC-USD',
                    amount: 0.5, // Less than required 1
                    locked: 0,
                },
            });

            // User 1 tries to place a market buy order
            await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: true,
                })
                .expect(400);
        });

        it('should maintain data consistency during complex matching', async () => {
            // Create balances for multiple users
            const user3 = await prisma.user.create({
                data: {
                    email: 'user3@example.com',
                    password: 'hashedpassword',
                    name: 'User 3',
                },
            });
            const user3Token = jwtService.sign({ id: user3.id, email: user3.email });

            await prisma.balance.createMany({
                data: [
                    {
                        userId: user1Id,
                        symbol: 'BTC-USD',
                        amount: 10,
                        locked: 0,
                    },
                    {
                        userId: user2Id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                    {
                        userId: user3.id,
                        symbol: 'USD',
                        amount: 500000,
                        locked: 0,
                    },
                ],
            });

            // Create multiple sell orders
            const sell1Response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 3,
                    market: false,
                })
                .expect(201);

            const sell2Response = await request(app.getHttpServer())
                .post('/orderbook/sell')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 51000,
                    quantity: 2,
                    market: false,
                })
                .expect(201);

            // Create multiple buy orders
            const buy1Response = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 2,
                    market: false,
                })
                .expect(201);

            const buy2Response = await request(app.getHttpServer())
                .post('/orderbook/buy')
                .set('Authorization', `Bearer ${user3Token}`)
                .send({
                    symbol: 'BTC-USD',
                    price: 50000,
                    quantity: 1,
                    market: false,
                })
                .expect(201);

            // Check final states
            expect(sell1Response.body.status).toBe('filled');
            expect(sell1Response.body.filledQuantity).toBe(3);
            expect(sell2Response.body.status).toBe('open');
            expect(sell2Response.body.filledQuantity).toBe(0);
            expect(buy1Response.body.status).toBe('filled');
            expect(buy1Response.body.filledQuantity).toBe(2);
            expect(buy2Response.body.status).toBe('filled');
            expect(buy2Response.body.filledQuantity).toBe(1);

            // Check that trades were created
            const trades = await prisma.trade.findMany();
            expect(trades).toHaveLength(2);

            // Check final balances
            const user1Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user1Id, symbol: 'BTC-USD' } },
            });
            const user2Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user2Id, symbol: 'BTC-USD' } },
            });
            const user3Balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user3.id, symbol: 'BTC-USD' } },
            });

            expect(user1Balance?.amount).toBe(7); // 10 - 3
            expect(user2Balance?.amount).toBe(2); // 0 + 2
            expect(user3Balance?.amount).toBe(1); // 0 + 1
        });
    });
});
