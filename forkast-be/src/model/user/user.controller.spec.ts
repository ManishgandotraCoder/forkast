import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma.service';
import { setupTestApp } from '../../../test/test-utils';

describe('UserController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeEach(async () => {
        process.env.JWT_SECRET = 'testsecret';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        setupTestApp(app);
        prisma = app.get(PrismaService);
        await app.init();

        // Clean database
        await prisma.trade.deleteMany();
        await prisma.order.deleteMany();
        await prisma.balance.deleteMany();
        await prisma.user.deleteMany();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /user/register', () => {
        it('should register a new user', async () => {
            const response = await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'register@example.com',
                    password: 'password123',
                    name: 'Test User',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe('register@example.com');
            expect(response.body.name).toBe('Test User');
        });

        it('should return 400 for invalid email', async () => {
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                    name: 'Test User',
                })
                .expect(400);
        });

        it('should return 400 for short password', async () => {
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'test@example.com',
                    password: '123',
                    name: 'Test User',
                })
                .expect(400);
        });
    });

    describe('POST /user/login', () => {
        beforeEach(async () => {
            // Register a user first
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                    name: 'Test User',
                });
        });

        it('should login and return token', async () => {
            const response = await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
        });

        it('should return 401 for wrong password', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword',
                })
                .expect(401);
        });
    });

    describe('GET /user/profile', () => {
        let token: string;

        beforeEach(async () => {
            // Register and login
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'profile@example.com',
                    password: 'password123',
                    name: 'Test User',
                });

            const loginResponse = await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'profile@example.com',
                    password: 'password123',
                });

            token = loginResponse.body.access_token;
        });

        it('should return user profile', async () => {
            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.email).toBe('profile@example.com');
            expect(response.body.name).toBe('Test User');
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .get('/user/profile')
                .expect(401);
        });
    });
});
