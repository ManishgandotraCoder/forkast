import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { setupTestApp } from './test-utils';

// Mock yahoo-finance2 for e2e tests
jest.mock('yahoo-finance2', () => ({
    quote: jest.fn(),
}));

describe('CryptoController (e2e)', () => {
    let app: INestApplication;
    let yahooFinance: any;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        setupTestApp(app);
        await app.init();

        yahooFinance = require('yahoo-finance2');
    });

    afterEach(async () => {
        await app.close();
        jest.clearAllMocks();
    });

    describe('GET /crypto/batch', () => {
        it('should return crypto list when no symbols provided', async () => {
            const response = await request(app.getHttpServer())
                .get('/crypto/batch')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // Check structure of first item
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('symbol');
                expect(response.body[0]).toHaveProperty('price');
                expect(response.body[0]).toHaveProperty('shortName');
                expect(response.body[0]).toHaveProperty('regularMarketPrice');
                expect(response.body[0]).toHaveProperty('regularMarketChange');
                expect(response.body[0]).toHaveProperty('regularMarketChangePercent');
                expect(response.body[0]).toHaveProperty('marketCap');
            }
        });

        it('should return crypto list when symbols parameter is provided', async () => {
            const response = await request(app.getHttpServer())
                .get('/crypto/batch?symbols=BTC-USD,ETH-USD')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should return crypto list when symbols parameter is empty', async () => {
            const response = await request(app.getHttpServer())
                .get('/crypto/batch?symbols=')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should return crypto list with correct data structure', async () => {
            const response = await request(app.getHttpServer())
                .get('/crypto/batch')
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);

            // Check that all items have the expected structure
            response.body.forEach((crypto: any) => {
                expect(crypto).toHaveProperty('symbol');
                expect(crypto).toHaveProperty('price');
                expect(crypto).toHaveProperty('shortName');
                expect(crypto).toHaveProperty('regularMarketPrice');
                expect(crypto).toHaveProperty('regularMarketChange');
                expect(crypto).toHaveProperty('regularMarketChangePercent');
                expect(crypto).toHaveProperty('marketCap');

                expect(typeof crypto.symbol).toBe('string');
                expect(typeof crypto.price).toBe('number');
                expect(typeof crypto.shortName).toBe('string');
                expect(typeof crypto.regularMarketPrice).toBe('number');
                expect(typeof crypto.regularMarketChange).toBe('number');
                expect(typeof crypto.regularMarketChangePercent).toBe('number');
                expect(typeof crypto.marketCap).toBe('number');
            });
        });
    });

    describe('GET /crypto/:symbol', () => {
        it('should return formatted quote for valid symbol', async () => {
            const mockQuote = {
                symbol: 'BTC-USD',
                regularMarketPrice: 50000,
                shortName: 'Bitcoin USD',
                regularMarketChange: 1000,
                regularMarketChangePercent: 2.0,
                marketCap: 1000000000000,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/BTC-USD')
                .expect(200);

            expect(yahooFinance.quote).toHaveBeenCalledWith('BTC-USD');
            expect(response.body).toEqual({
                symbol: 'BTC-USD',
                price: 50000,
                shortName: 'Bitcoin USD',
                regularMarketPrice: 50000,
                regularMarketChange: 1000,
                regularMarketChangePercent: 2.0,
                marketCap: 1000000000000,
            });
        });

        it('should handle quote with missing optional fields', async () => {
            const mockQuote = {
                symbol: 'ETH-USD',
                regularMarketPrice: 3000,
                // Missing optional fields
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/ETH-USD')
                .expect(200);

            expect(response.body).toEqual({
                symbol: 'ETH-USD',
                price: 3000,
                shortName: '',
                regularMarketPrice: 3000,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });

        it('should handle quote with null/undefined values', async () => {
            const mockQuote = {
                symbol: 'XRP-USD',
                regularMarketPrice: 0.5,
                shortName: null,
                regularMarketChange: undefined,
                regularMarketChangePercent: null,
                marketCap: undefined,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/XRP-USD')
                .expect(200);

            expect(response.body).toEqual({
                symbol: 'XRP-USD',
                price: 0.5,
                shortName: '',
                regularMarketPrice: 0.5,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });

        it('should return error object when yahooFinance.quote throws', async () => {
            yahooFinance.quote.mockRejectedValue(new Error('API Error'));

            const response = await request(app.getHttpServer())
                .get('/crypto/INVALID-SYMBOL')
                .expect(200);

            expect(response.body).toEqual({ error: 'Failed to fetch quote' });
        });

        it('should return error object when yahooFinance.quote throws non-Error', async () => {
            yahooFinance.quote.mockRejectedValue('String error');

            const response = await request(app.getHttpServer())
                .get('/crypto/INVALID-SYMBOL')
                .expect(200);

            expect(response.body).toEqual({ error: 'Failed to fetch quote' });
        });

        it('should handle decimal values correctly', async () => {
            const mockQuote = {
                symbol: 'DOGE-USD',
                regularMarketPrice: 0.123456,
                shortName: 'Dogecoin USD',
                regularMarketChange: -0.001234,
                regularMarketChangePercent: -0.99,
                marketCap: 1234567890.123,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/DOGE-USD')
                .expect(200);

            expect(response.body).toEqual({
                symbol: 'DOGE-USD',
                price: 0.123456,
                shortName: 'Dogecoin USD',
                regularMarketPrice: 0.123456,
                regularMarketChange: -0.001234,
                regularMarketChangePercent: -0.99,
                marketCap: 1234567890.123,
            });
        });

        it('should handle zero values', async () => {
            const mockQuote = {
                symbol: 'TEST-USD',
                regularMarketPrice: 0,
                shortName: 'Test USD',
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/TEST-USD')
                .expect(200);

            expect(response.body).toEqual({
                symbol: 'TEST-USD',
                price: 0,
                shortName: 'Test USD',
                regularMarketPrice: 0,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });

        it('should handle very large numbers', async () => {
            const mockQuote = {
                symbol: 'BTC-USD',
                regularMarketPrice: 999999999.99,
                shortName: 'Bitcoin USD',
                regularMarketChange: 999999999.99,
                regularMarketChangePercent: 999.99,
                marketCap: 999999999999999,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/BTC-USD')
                .expect(200);

            expect(response.body).toEqual({
                symbol: 'BTC-USD',
                price: 999999999.99,
                shortName: 'Bitcoin USD',
                regularMarketPrice: 999999999.99,
                regularMarketChange: 999999999.99,
                regularMarketChangePercent: 999.99,
                marketCap: 999999999999999,
            });
        });

        it('should handle different symbol formats', async () => {
            const mockQuote = {
                symbol: 'SOL-USD',
                regularMarketPrice: 150,
                shortName: 'Solana USD',
                regularMarketChange: 5,
                regularMarketChangePercent: 3.45,
                marketCap: 60000000000,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const response = await request(app.getHttpServer())
                .get('/crypto/SOL-USD')
                .expect(200);

            expect(response.body.symbol).toBe('SOL-USD');
            expect(response.body.price).toBe(150);
            expect(response.body.shortName).toBe('Solana USD');
        });
    });
});
