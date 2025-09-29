import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';

export interface KeyPair {
    publicKey: string;
    privateKey: string;
}

export interface EncryptedData {
    data: string;
    key: string;
    iv: string;
}

@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly rsaKey: NodeRSA;
    private readonly aesKey: string;

    constructor(private configService: ConfigService) {
        // Initialize RSA key pair
        this.rsaKey = new NodeRSA({ b: 2048 });
        this.aesKey = this.configService.get<string>('encryption.aesKey') || this.generateAESKey();

        // Log key generation (in production, store keys securely)
        this.logger.log('Encryption service initialized');
    }

    /**
     * Generate a new RSA key pair
     */
    generateRSAKeyPair(): KeyPair {
        const key = new NodeRSA({ b: 2048 });
        return {
            publicKey: key.exportKey('public'),
            privateKey: key.exportKey('private'),
        };
    }

    /**
     * Generate a random AES key
     */
    generateAESKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Encrypt data using RSA public key
     */
    encryptWithRSA(data: string, publicKey: string): string {
        try {
            const key = new NodeRSA(publicKey);
            return key.encrypt(data, 'base64');
        } catch (error) {
            this.logger.error('RSA encryption failed:', error);
            throw new Error('RSA encryption failed');
        }
    }

    /**
     * Decrypt data using RSA private key
     */
    decryptWithRSA(encryptedData: string, privateKey: string): string {
        try {
            const key = new NodeRSA(privateKey);
            return key.decrypt(encryptedData, 'utf8');
        } catch (error) {
            this.logger.error('RSA decryption failed:', error);
            throw new Error('RSA decryption failed');
        }
    }

    /**
     * Encrypt data using AES-256-CBC
     */
    encryptWithAES(data: string, key?: string): EncryptedData {
        try {
            const encryptionKey = key || this.aesKey;
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);

            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            return {
                data: encrypted,
                key: encryptionKey,
                iv: iv.toString('hex'),
            };
        } catch (error) {
            this.logger.error('AES encryption failed:', error);
            throw new Error('AES encryption failed');
        }
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    decryptWithAES(encryptedData: EncryptedData): string {
        try {
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptedData.key, 'hex'), iv);
            let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            this.logger.error('AES decryption failed:', error);
            throw new Error('AES decryption failed');
        }
    }

    /**
     * Encrypt sensitive user data (email, personal info)
     */
    encryptUserData(data: any): any {
        const encrypted = { ...data };

        // Encrypt email
        if (encrypted.email) {
            encrypted.email = this.encryptWithRSA(encrypted.email, this.rsaKey.exportKey('public'));
        }

        // Encrypt name
        if (encrypted.name) {
            encrypted.name = this.encryptWithRSA(encrypted.name, this.rsaKey.exportKey('public'));
        }

        return encrypted;
    }

    /**
     * Decrypt sensitive user data
     */
    decryptUserData(data: any): any {
        const decrypted = { ...data };

        // Decrypt email
        if (decrypted.email) {
            decrypted.email = this.decryptWithRSA(decrypted.email, this.rsaKey.exportKey('private'));
        }

        // Decrypt name
        if (decrypted.name) {
            decrypted.name = this.decryptWithRSA(decrypted.name, this.rsaKey.exportKey('private'));
        }

        return decrypted;
    }

    /**
     * Encrypt trading data (orders, balances, transactions)
     */
    encryptTradingData(data: any): any {
        const encrypted = { ...data };

        // Encrypt order details
        if (encrypted.symbol) {
            encrypted.symbol = this.encryptWithAES(encrypted.symbol).data;
        }

        if (encrypted.price) {
            encrypted.price = this.encryptWithAES(encrypted.price.toString()).data;
        }

        if (encrypted.quantity) {
            encrypted.quantity = this.encryptWithAES(encrypted.quantity.toString()).data;
        }

        return encrypted;
    }

    /**
     * Decrypt trading data
     */
    decryptTradingData(data: any): any {
        const decrypted = { ...data };

        // Decrypt order details
        if (decrypted.symbol) {
            decrypted.symbol = this.decryptWithAES({ data: decrypted.symbol, key: this.aesKey, iv: '' });
        }

        if (decrypted.price) {
            decrypted.price = parseFloat(this.decryptWithAES({ data: decrypted.price, key: this.aesKey, iv: '' }));
        }

        if (decrypted.quantity) {
            decrypted.quantity = parseFloat(this.decryptWithAES({ data: decrypted.quantity, key: this.aesKey, iv: '' }));
        }

        return decrypted;
    }

    /**
     * Hash password with salt
     */
    hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * Verify password against hash
     */
    verifyPassword(password: string, hash: string): boolean {
        const [salt, hashedPassword] = hash.split(':');
        const hashToVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hashToVerify === hashedPassword;
    }

    /**
     * Generate a secure random token
     */
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Get the public key for client-side encryption
     */
    getPublicKey(): string {
        return this.rsaKey.exportKey('public');
    }
}
