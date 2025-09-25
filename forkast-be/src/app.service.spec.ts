import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = module.get<AppService>(AppService);
    });

    describe('getHello', () => {
        it('should return "Hello World!"', () => {
            const result = service.getHello();
            expect(result).toBe('Hello World!');
        });

        it('should return a string', () => {
            const result = service.getHello();
            expect(typeof result).toBe('string');
        });

        it('should return the exact expected message', () => {
            const result = service.getHello();
            expect(result).toEqual('Hello World!');
        });

        it('should be consistent across multiple calls', () => {
            const result1 = service.getHello();
            const result2 = service.getHello();
            const result3 = service.getHello();

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
            expect(result1).toBe('Hello World!');
        });

        it('should not return null', () => {
            const result = service.getHello();
            expect(result).not.toBeNull();
        });

        it('should not return undefined', () => {
            const result = service.getHello();
            expect(result).not.toBeUndefined();
        });

        it('should not return empty string', () => {
            const result = service.getHello();
            expect(result).not.toBe('');
        });

        it('should return a non-empty string', () => {
            const result = service.getHello();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return a string with expected length', () => {
            const result = service.getHello();
            expect(result.length).toBe(12); // "Hello World!" has 12 characters
        });

        it('should return a string that starts with "Hello"', () => {
            const result = service.getHello();
            expect(result.startsWith('Hello')).toBe(true);
        });

        it('should return a string that ends with "!"', () => {
            const result = service.getHello();
            expect(result.endsWith('!')).toBe(true);
        });

        it('should return a string that contains "World"', () => {
            const result = service.getHello();
            expect(result.includes('World')).toBe(true);
        });

        it('should return a string that matches the expected pattern', () => {
            const result = service.getHello();
            expect(result).toMatch(/^Hello World!$/);
        });

        it('should be a pure function (no side effects)', () => {
            // Call the method multiple times and ensure it returns the same result
            const results = Array.from({ length: 10 }, () => service.getHello());
            const uniqueResults = [...new Set(results)];
            expect(uniqueResults).toHaveLength(1);
            expect(uniqueResults[0]).toBe('Hello World!');
        });

        it('should not throw any errors', () => {
            expect(() => service.getHello()).not.toThrow();
        });

        it('should be synchronous', () => {
            const result = service.getHello();
            expect(typeof result).toBe('string');
            // If it were async, result would be a Promise
            expect(result).not.toBeInstanceOf(Promise);
        });
    });
});
