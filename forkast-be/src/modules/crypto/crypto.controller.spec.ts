import { Test, TestingModule } from '@nestjs/testing';
import { CryptoController } from './crypto.controller';
import { CryptoModule } from './crypto.module';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => ({
    quote: jest.fn(),
}));

describe('CryptoController', () => {
    let controller: CryptoController;
    let yahooFinance: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CryptoModule],
        }).compile();

        controller = module.get<CryptoController>(CryptoController);
        yahooFinance = require('yahoo-finance2');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getBatchQuotes', () => {
        it('should return crypto list when no symbols provided', async () => {
            const result = await controller.getBatchQuotes();

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);

            // Check structure of first item
            if (result.length > 0) {
                expect(result[0]).toHaveProperty('symbol');
                expect(result[0]).toHaveProperty('price');
                expect(result[0]).toHaveProperty('shortName');
            }
        });

        it('should return crypto list when symbols parameter is provided', async () => {
            const result = await controller.getBatchQuotes('BTC-USD,ETH-USD');

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return crypto list when symbols parameter is empty string', async () => {
            const result = await controller.getBatchQuotes('');

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getSingleQuote', () => {
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

            const result = await controller.getSingleQuote('BTC-USD');

            expect(yahooFinance.quote).toHaveBeenCalledWith('BTC-USD');
            expect(result).toEqual({
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
                symbol: 'BTC-USD',
                regularMarketPrice: 50000,
                // Missing optional fields
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const result = await controller.getSingleQuote('BTC-USD');

            expect(result).toEqual({
                symbol: 'BTC-USD',
                price: 50000,
                shortName: '',
                regularMarketPrice: 50000,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });

        it('should handle quote with null/undefined values', async () => {
            const mockQuote = {
                symbol: 'BTC-USD',
                regularMarketPrice: 50000,
                shortName: null,
                regularMarketChange: undefined,
                regularMarketChangePercent: null,
                marketCap: undefined,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const result = await controller.getSingleQuote('BTC-USD');

            expect(result).toEqual({
                symbol: 'BTC-USD',
                price: 50000,
                shortName: '',
                regularMarketPrice: 50000,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });

        it('should return error object when yahooFinance.quote throws', async () => {
            yahooFinance.quote.mockRejectedValue(new Error('API Error'));

            const result = await controller.getSingleQuote('INVALID-SYMBOL');

            expect(result).toEqual({ error: 'Failed to fetch quote' });
        });

        it('should return error object when yahooFinance.quote throws non-Error', async () => {
            yahooFinance.quote.mockRejectedValue('String error');

            const result = await controller.getSingleQuote('INVALID-SYMBOL');

            expect(result).toEqual({ error: 'Failed to fetch quote' });
        });

        it('should handle decimal values correctly', async () => {
            const mockQuote = {
                symbol: 'ETH-USD',
                regularMarketPrice: 3450.123456,
                shortName: 'Ethereum USD',
                regularMarketChange: -25.789,
                regularMarketChangePercent: -0.741,
                marketCap: 414321000000.5,
            };

            yahooFinance.quote.mockResolvedValue(mockQuote);

            const result = await controller.getSingleQuote('ETH-USD');

            expect(result).toEqual({
                symbol: 'ETH-USD',
                price: 3450.123456,
                shortName: 'Ethereum USD',
                regularMarketPrice: 3450.123456,
                regularMarketChange: -25.789,
                regularMarketChangePercent: -0.741,
                marketCap: 414321000000.5,
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

            const result = await controller.getSingleQuote('BTC-USD');

            expect(result).toEqual({
                symbol: 'BTC-USD',
                price: 999999999.99,
                shortName: 'Bitcoin USD',
                regularMarketPrice: 999999999.99,
                regularMarketChange: 999999999.99,
                regularMarketChangePercent: 999.99,
                marketCap: 999999999999999,
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

            const result = await controller.getSingleQuote('TEST-USD');

            expect(result).toEqual({
                symbol: 'TEST-USD',
                price: 0,
                shortName: 'Test USD',
                regularMarketPrice: 0,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                marketCap: 0,
            });
        });
    });
});