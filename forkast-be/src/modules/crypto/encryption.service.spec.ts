import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
    let service: EncryptionService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                'encryption.aesKey': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
                                'encryption.rsaKeySize': 2048,
                                'encryption.enableEncryption': true,
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should generate RSA key pair', () => {
        const keyPair = service.generateRSAKeyPair();
        expect(keyPair).toHaveProperty('publicKey');
        expect(keyPair).toHaveProperty('privateKey');
        expect(keyPair.publicKey).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
    });

    it('should encrypt and decrypt data with RSA', () => {
        const keyPair = service.generateRSAKeyPair();
        const testData = 'Hello, World!';

        const encrypted = service.encryptWithRSA(testData, keyPair.publicKey);
        const decrypted = service.decryptWithRSA(encrypted, keyPair.privateKey);

        expect(decrypted).toBe(testData);
    });

    it('should encrypt and decrypt data with AES', () => {
        const testData = 'Hello, World!';
        const encrypted = service.encryptWithAES(testData);

        expect(encrypted).toHaveProperty('data');
        expect(encrypted).toHaveProperty('key');
        expect(encrypted).toHaveProperty('iv');

        const decrypted = service.decryptWithAES(encrypted);
        expect(decrypted).toBe(testData);
    });

    it('should encrypt user data', () => {
        const userData = {
            email: 'test@example.com',
            name: 'John Doe',
            age: 30,
        };

        const encrypted = service.encryptUserData(userData);

        expect(encrypted.email).not.toBe(userData.email);
        expect(encrypted.name).not.toBe(userData.name);
        expect(encrypted.age).toBe(userData.age); // Age should not be encrypted
    });

    it('should encrypt trading data', () => {
        const tradingData = {
            symbol: 'BTC-USD',
            price: 50000,
            quantity: 0.1,
        };

        const encrypted = service.encryptTradingData(tradingData);

        expect(encrypted.symbol).not.toBe(tradingData.symbol);
        expect(encrypted.price).not.toBe(tradingData.price);
        expect(encrypted.quantity).not.toBe(tradingData.quantity);
    });

    it('should hash password', () => {
        const password = 'testpassword';
        const hash = service.hashPassword(password);

        expect(hash).toContain(':');
        expect(hash).not.toBe(password);
    });

    it('should verify password', () => {
        const password = 'testpassword';
        const hash = service.hashPassword(password);

        expect(service.verifyPassword(password, hash)).toBe(true);
        expect(service.verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('should generate secure token', () => {
        const token = service.generateSecureToken(32);

        expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
        expect(typeof token).toBe('string');
    });
});
