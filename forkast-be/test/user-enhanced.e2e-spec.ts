import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp } from './test-utils';

describe('UserController Enhanced (e2e)', () => {
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
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /user/register', () => {
        it('should register a new user with valid data', async () => {
            const userData = {
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User',
            };

            const response = await request(app.getHttpServer())
                .post('/user/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe(userData.email);
            expect(response.body.name).toBe(userData.name);
            expect(response.body).not.toHaveProperty('password');

            // Verify user was created in database
            const user = await prisma.user.findUnique({
                where: { email: userData.email },
            });
            expect(user).toBeDefined();
            expect(user?.email).toBe(userData.email);
            expect(user?.name).toBe(userData.name);

            // Verify initial USD balance was created
            const balance = await prisma.balance.findUnique({
                where: { userId_symbol: { userId: user!.id, symbol: 'USD' } },
            });
            expect(balance).toBeDefined();
            expect(balance?.amount).toBe(10000);
        });

        it('should return 400 for duplicate email', async () => {
            // First registration
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'password123',
                    name: 'First User',
                })
                .expect(201);

            // Second registration with same email
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'password456',
                    name: 'Second User',
                })
                .expect(400);
        });

        it('should return 400 for invalid email format', async () => {
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

        it('should return 400 for empty name', async () => {
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    name: '',
                })
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'test@example.com',
                    // missing password and name
                })
                .expect(400);
        });

        it('should handle special characters in name', async () => {
            const userData = {
                email: 'special@example.com',
                password: 'password123',
                name: 'Test User with Special Characters !@#$%^&*()',
            };

            const response = await request(app.getHttpServer())
                .post('/user/register')
                .send(userData)
                .expect(201);

            expect(response.body.name).toBe(userData.name);
        });

        it('should handle long names', async () => {
            const userData = {
                email: 'longname@example.com',
                password: 'password123',
                name: 'A'.repeat(100), // 100 character name
            };

            const response = await request(app.getHttpServer())
                .post('/user/register')
                .send(userData)
                .expect(201);

            expect(response.body.name).toBe(userData.name);
        });

        it('should handle edge case email formats', async () => {
            const validEmails = [
                'test+tag@example.com',
                'test.name@example.com',
                'test123@example.co.uk',
                'user@subdomain.example.com',
            ];

            for (const email of validEmails) {
                const userData = {
                    email,
                    password: 'password123',
                    name: 'Test User',
                };

                const response = await request(app.getHttpServer())
                    .post('/user/register')
                    .send(userData)
                    .expect(201);

                expect(response.body.email).toBe(email);
            }
        });
    });

    describe('POST /user/login', () => {
        beforeEach(async () => {
            // Register a user for login tests
            const user = await prisma.user.create({
                data: {
                    email: 'login@example.com',
                    password: 'hashedpassword',
                    name: 'Login User',
                },
            });
            userId = user.id;
        });

        it('should login with valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body.name).toBe('Login User');
            expect(response.body.email).toBe('login@example.com');
            expect(typeof response.body.access_token).toBe('string');
            expect(response.body.access_token.length).toBeGreaterThan(0);
        });

        it('should return 401 for invalid email', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                })
                .expect(401);
        });

        it('should return 401 for invalid password', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('should return 400 for invalid email format', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                })
                .expect(400);
        });

        it('should return 400 for empty password', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: '',
                })
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    // missing password
                })
                .expect(400);
        });

        it('should generate valid JWT token', async () => {
            const response = await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            const token = response.body.access_token;

            // Verify token can be decoded
            const decoded = jwtService.verify(token);
            expect(decoded).toHaveProperty('id');
            expect(decoded).toHaveProperty('email');
            expect(decoded.email).toBe('login@example.com');
        });

        it('should handle case sensitivity in email', async () => {
            await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'LOGIN@EXAMPLE.COM', // uppercase
                    password: 'password123',
                })
                .expect(401); // Should fail due to case sensitivity
        });
    });

    describe('GET /user/profile', () => {
        beforeEach(async () => {
            // Register and login a user
            const user = await prisma.user.create({
                data: {
                    email: 'profile@example.com',
                    password: 'hashedpassword',
                    name: 'Profile User',
                },
            });
            userId = user.id;

            authToken = jwtService.sign({ id: userId, email: user.email });
        });

        it('should return user profile with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('email');
            expect(response.body).toHaveProperty('name');
            expect(response.body.email).toBe('profile@example.com');
            expect(response.body.name).toBe('Profile User');
            expect(response.body).not.toHaveProperty('password');
        });

        it('should return 401 without authorization header', async () => {
            await request(app.getHttpServer())
                .get('/user/profile')
                .expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should return 401 with malformed authorization header', async () => {
            await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', 'InvalidFormat token')
                .expect(401);
        });

        it('should return 401 with expired token', async () => {
            const expiredToken = jwtService.sign(
                { id: userId, email: 'profile@example.com' },
                { expiresIn: '-1h' } // Expired 1 hour ago
            );

            await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);
        });

        it('should return 404 for non-existent user', async () => {
            const nonExistentToken = jwtService.sign({
                id: 99999,
                email: 'nonexistent@example.com',
            });

            await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${nonExistentToken}`)
                .expect(404);
        });

        it('should handle token with different user ID', async () => {
            const differentUserToken = jwtService.sign({
                id: 88888,
                email: 'different@example.com',
            });

            await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${differentUserToken}`)
                .expect(404);
        });
    });

    describe('Integration Tests', () => {
        it('should complete full user lifecycle', async () => {
            // 1. Register user
            const registerResponse = await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'lifecycle@example.com',
                    password: 'password123',
                    name: 'Lifecycle User',
                })
                .expect(201);

            const userId = registerResponse.body.id;

            // 2. Login user
            const loginResponse = await request(app.getHttpServer())
                .post('/user/login')
                .send({
                    email: 'lifecycle@example.com',
                    password: 'password123',
                })
                .expect(200);

            const token = loginResponse.body.access_token;

            // 3. Get profile
            const profileResponse = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(profileResponse.body.id).toBe(userId);
            expect(profileResponse.body.email).toBe('lifecycle@example.com');
            expect(profileResponse.body.name).toBe('Lifecycle User');
        });

        it('should handle concurrent user registrations', async () => {
            const users = Array.from({ length: 5 }, (_, i) => ({
                email: `concurrent${i}@example.com`,
                password: 'password123',
                name: `Concurrent User ${i}`,
            }));

            const promises = users.map(user =>
                request(app.getHttpServer())
                    .post('/user/register')
                    .send(user)
                    .expect(201)
            );

            const responses = await Promise.all(promises);

            responses.forEach((response, index) => {
                expect(response.body.email).toBe(users[index].email);
                expect(response.body.name).toBe(users[index].name);
            });
        });

        it('should handle multiple login attempts', async () => {
            // Register user
            await request(app.getHttpServer())
                .post('/user/register')
                .send({
                    email: 'multilogin@example.com',
                    password: 'password123',
                    name: 'Multi Login User',
                })
                .expect(201);

            // Multiple successful logins
            const promises = Array.from({ length: 3 }, () =>
                request(app.getHttpServer())
                    .post('/user/login')
                    .send({
                        email: 'multilogin@example.com',
                        password: 'password123',
                    })
                    .expect(200)
            );

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.body).toHaveProperty('access_token');
                expect(response.body.email).toBe('multilogin@example.com');
            });
        });
    });
});
