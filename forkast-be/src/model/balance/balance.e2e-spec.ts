import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma.service';

describe('BalanceController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authToken: string;
    let userId: number;

    beforeEach(async () => {
        process.env.JWT_SECRET = 'testsecret';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        prisma = app.get(PrismaService);
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

        // Create JWT token manually for testing
        const jwt = require('jsonwebtoken');
        authToken = jwt.sign({ id: userId, email: user.email }, 'testsecret');
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /balance', () => {
        it('should return user balances when authenticated', async () => {
            // Create test balances
            await prisma.balance.createMany({
                data: [
                    {
                        userId,
                        symbol: 'BTC',
                        amount: 100.5,
                        locked: 10.0,
                    },
                    {
                        userId,
                        symbol: 'ETH',
                        amount: 50.0,
                        locked: 5.0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([
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
            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should return 401 when no authorization header is provided', async () => {
            await request(app.getHttpServer())
                .get('/balance')
                .expect(401);
        });

        it('should return 401 when invalid token is provided', async () => {
            await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should return 401 when malformed authorization header is provided', async () => {
            await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', 'InvalidFormat token')
                .expect(401);
        });

        it('should handle zero amounts correctly', async () => {
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC',
                    amount: 0,
                    locked: 0,
                },
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: 0,
                    locked: 0,
                    total: 0,
                },
            ]);
        });

        it('should handle case where locked amount equals total amount', async () => {
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC',
                    amount: 100.0,
                    locked: 100.0,
                },
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: 0, // 100.0 - 100.0
                    locked: 100.0,
                    total: 100.0,
                },
            ]);
        });

        it('should handle case where locked amount is greater than total amount', async () => {
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC',
                    amount: 50.0,
                    locked: 75.0,
                },
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: -25.0, // 50.0 - 75.0
                    locked: 75.0,
                    total: 50.0,
                },
            ]);
        });

        it('should handle decimal precision correctly', async () => {
            await prisma.balance.create({
                data: {
                    userId,
                    symbol: 'BTC',
                    amount: 0.123456789,
                    locked: 0.012345678,
                },
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: 0.111111111, // 0.123456789 - 0.012345678
                    locked: 0.012345678,
                    total: 0.123456789,
                },
            ]);
        });

        it('should only return balances for the authenticated user', async () => {
            // Create another user
            const otherUser = await prisma.user.create({
                data: {
                    email: 'other@example.com',
                    password: 'hashedpassword',
                    name: 'Other User',
                },
            });

            // Create balances for both users
            await prisma.balance.createMany({
                data: [
                    {
                        userId,
                        symbol: 'BTC',
                        amount: 100.0,
                        locked: 10.0,
                    },
                    {
                        userId: otherUser.id,
                        symbol: 'BTC',
                        amount: 200.0,
                        locked: 20.0,
                    },
                    {
                        userId,
                        symbol: 'ETH',
                        amount: 50.0,
                        locked: 5.0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Should only return balances for the authenticated user
            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: 90.0, // 100.0 - 10.0
                    locked: 10.0,
                    total: 100.0,
                },
                {
                    asset: 'ETH',
                    available: 45.0, // 50.0 - 5.0
                    locked: 5.0,
                    total: 50.0,
                },
            ]);
        });

        it('should handle multiple symbols correctly', async () => {
            await prisma.balance.createMany({
                data: [
                    {
                        userId,
                        symbol: 'BTC',
                        amount: 1.5,
                        locked: 0.1,
                    },
                    {
                        userId,
                        symbol: 'ETH',
                        amount: 10.0,
                        locked: 2.0,
                    },
                    {
                        userId,
                        symbol: 'ADA',
                        amount: 1000.0,
                        locked: 100.0,
                    },
                    {
                        userId,
                        symbol: 'DOT',
                        amount: 50.0,
                        locked: 0.0,
                    },
                ],
            });

            const response = await request(app.getHttpServer())
                .get('/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveLength(4);
            expect(response.body).toEqual([
                {
                    asset: 'BTC',
                    available: 1.4, // 1.5 - 0.1
                    locked: 0.1,
                    total: 1.5,
                },
                {
                    asset: 'ETH',
                    available: 8.0, // 10.0 - 2.0
                    locked: 2.0,
                    total: 10.0,
                },
                {
                    asset: 'ADA',
                    available: 900.0, // 1000.0 - 100.0
                    locked: 100.0,
                    total: 1000.0,
                },
                {
                    asset: 'DOT',
                    available: 50.0, // 50.0 - 0.0
                    locked: 0.0,
                    total: 50.0,
                },
            ]);
        });
    });
});
