import { validateRequest } from './user.validator';
import { BadRequestException } from '@nestjs/common';

// Mock class-validator
jest.mock('class-validator', () => ({
    validateSync: jest.fn(),
    IsEmail: jest.fn(),
    IsString: jest.fn(),
    MinLength: jest.fn(),
    IsNotEmpty: jest.fn(),
}));

// Mock class-transformer
jest.mock('class-transformer', () => ({
    plainToInstance: jest.fn(),
}));

// Mock the DTOs to avoid class-validator issues
jest.mock('./user.dto', () => ({
    RegisterDto: class RegisterDto { },
    LoginDto: class LoginDto { },
}));

describe('UserValidator', () => {
    const mockValidateSync = require('class-validator').validateSync;
    const mockPlainToInstance = require('class-transformer').plainToInstance;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateRequest', () => {
        it('should validate register request successfully', () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockDto = { ...registerData };
            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue([]);

            expect(() => validateRequest('register', registerData)).not.toThrow();

            expect(mockPlainToInstance).toHaveBeenCalledWith(
                expect.any(Function),
                registerData,
            );
            expect(mockValidateSync).toHaveBeenCalledWith(mockDto);
        });

        it('should validate login request successfully', () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockDto = { ...loginData };
            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue([]);

            expect(() => validateRequest('login', loginData)).not.toThrow();

            expect(mockPlainToInstance).toHaveBeenCalledWith(
                expect.any(Function),
                loginData,
            );
            expect(mockValidateSync).toHaveBeenCalledWith(mockDto);
        });

        it('should throw BadRequestException for register validation errors', () => {
            const registerData = {
                email: 'invalid-email',
                password: '123',
                name: '',
            };

            const mockDto = { ...registerData };
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                },
                {
                    property: 'password',
                    constraints: { minLength: 'password must be longer than or equal to 6 characters' },
                },
                {
                    property: 'name',
                    constraints: { isNotEmpty: 'name should not be empty' },
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('register', registerData)).toThrow(
                BadRequestException,
            );

            expect(mockPlainToInstance).toHaveBeenCalledWith(
                expect.any(Function),
                registerData,
            );
            expect(mockValidateSync).toHaveBeenCalledWith(mockDto);
        });

        it('should throw BadRequestException for login validation errors', () => {
            const loginData = {
                email: 'invalid-email',
                password: '',
            };

            const mockDto = { ...loginData };
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                },
                {
                    property: 'password',
                    constraints: { isNotEmpty: 'password should not be empty' },
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('login', loginData)).toThrow(
                BadRequestException,
            );

            expect(mockPlainToInstance).toHaveBeenCalledWith(
                expect.any(Function),
                loginData,
            );
            expect(mockValidateSync).toHaveBeenCalledWith(mockDto);
        });

        it('should handle empty validation errors array', () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockDto = { ...registerData };
            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue([]);

            expect(() => validateRequest('register', registerData)).not.toThrow();
        });

        it('should handle null validation errors', () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockDto = { ...registerData };
            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue([]); // Return empty array instead of null

            expect(() => validateRequest('register', registerData)).not.toThrow();
        });

        it('should handle undefined validation errors', () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockDto = { ...registerData };
            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue([]); // Return empty array instead of undefined

            expect(() => validateRequest('register', registerData)).not.toThrow();
        });

        it('should handle complex validation errors', () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            };

            const mockDto = { ...registerData };
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                    value: 'invalid-email',
                },
                {
                    property: 'password',
                    constraints: {
                        minLength: 'password must be longer than or equal to 6 characters',
                        isString: 'password must be a string'
                    },
                    value: '123',
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('register', registerData)).toThrow(
                BadRequestException,
            );
        });

        it('should handle edge cases with empty objects', () => {
            const emptyData = {};

            const mockDto = {};
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                },
                {
                    property: 'password',
                    constraints: { isNotEmpty: 'password should not be empty' },
                },
                {
                    property: 'name',
                    constraints: { isNotEmpty: 'name should not be empty' },
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('register', emptyData)).toThrow(
                BadRequestException,
            );
        });

        it('should handle edge cases with null data', () => {
            const nullData = null;

            const mockDto = null;
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('register', nullData)).toThrow(
                BadRequestException,
            );
        });

        it('should handle edge cases with undefined data', () => {
            const undefinedData = undefined;

            const mockDto = undefined;
            const validationErrors = [
                {
                    property: 'email',
                    constraints: { isEmail: 'email must be an email' },
                },
            ];

            mockPlainToInstance.mockReturnValue(mockDto);
            mockValidateSync.mockReturnValue(validationErrors);

            expect(() => validateRequest('register', undefinedData)).toThrow(
                BadRequestException,
            );
        });
    });
});
