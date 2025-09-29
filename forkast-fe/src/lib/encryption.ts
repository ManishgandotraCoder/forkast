import * as CryptoJS from 'crypto-js';

export interface EncryptedData {
    data: string;
    key: string;
    iv: string;
}

export class EncryptionUtils {
    private static readonly AES_KEY_SIZE = 256;
    private static readonly IV_SIZE = 16;

    /**
     * Generate a random AES key
     */
    static generateAESKey(): string {
        return CryptoJS.lib.WordArray.random(this.AES_KEY_SIZE / 8).toString();
    }

    /**
     * Generate a random IV
     */
    static generateIV(): string {
        return CryptoJS.lib.WordArray.random(this.IV_SIZE).toString();
    }

    /**
     * Encrypt data using AES-256-CBC
     */
    static encryptWithAES(data: string, key: string): EncryptedData {
        try {
            const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);
            const encrypted = CryptoJS.AES.encrypt(data, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            return {
                data: encrypted.toString(),
                key: key,
                iv: iv.toString(),
            };
        } catch (error) {
            console.error('AES encryption failed:', error);
            throw new Error('AES encryption failed');
        }
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    static decryptWithAES(encryptedData: EncryptedData): string {
        try {
            const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
            const decrypted = CryptoJS.AES.decrypt(encryptedData.data, encryptedData.key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('AES decryption failed:', error);
            throw new Error('AES decryption failed');
        }
    }

    /**
     * Encrypt sensitive data before sending to API
     */
    static encryptSensitiveData(data: any): any {
        const encrypted = { ...data };

        // Encrypt email if present
        if (encrypted.email) {
            const key = this.generateAESKey();
            const encryptedEmail = this.encryptWithAES(encrypted.email, key);
            encrypted.email = encryptedEmail.data;
            encrypted.emailKey = encryptedEmail.key;
            encrypted.emailIv = encryptedEmail.iv;
        }

        // Encrypt name if present
        if (encrypted.name) {
            const key = this.generateAESKey();
            const encryptedName = this.encryptWithAES(encrypted.name, key);
            encrypted.name = encryptedName.data;
            encrypted.nameKey = encryptedName.key;
            encrypted.nameIv = encryptedName.iv;
        }

        return encrypted;
    }

    /**
     * Decrypt sensitive data received from API
     */
    static decryptSensitiveData(data: any): any {
        const decrypted = { ...data };

        // Decrypt email if present
        if (decrypted.encryptedEmail && decrypted.emailKey && decrypted.emailIv) {
            decrypted.email = this.decryptWithAES({
                data: decrypted.encryptedEmail,
                key: decrypted.emailKey,
                iv: decrypted.emailIv,
            });
        }

        // Decrypt name if present
        if (decrypted.encryptedName && decrypted.nameKey && decrypted.nameIv) {
            decrypted.name = this.decryptWithAES({
                data: decrypted.encryptedName,
                key: decrypted.nameKey,
                iv: decrypted.nameIv,
            });
        }

        return decrypted;
    }

    /**
     * Encrypt trading data (orders, balances)
     */
    static encryptTradingData(data: any): any {
        const encrypted = { ...data };

        // Encrypt symbol if present
        if (encrypted.symbol) {
            const key = this.generateAESKey();
            const encryptedSymbol = this.encryptWithAES(encrypted.symbol, key);
            encrypted.symbol = encryptedSymbol.data;
            encrypted.symbolKey = encryptedSymbol.key;
            encrypted.symbolIv = encryptedSymbol.iv;
        }

        // Encrypt price if present
        if (encrypted.price) {
            const key = this.generateAESKey();
            const encryptedPrice = this.encryptWithAES(encrypted.price.toString(), key);
            encrypted.price = encryptedPrice.data;
            encrypted.priceKey = encryptedPrice.key;
            encrypted.priceIv = encryptedPrice.iv;
        }

        // Encrypt quantity if present
        if (encrypted.quantity) {
            const key = this.generateAESKey();
            const encryptedQuantity = this.encryptWithAES(encrypted.quantity.toString(), key);
            encrypted.quantity = encryptedQuantity.data;
            encrypted.quantityKey = encryptedQuantity.key;
            encrypted.quantityIv = encryptedQuantity.iv;
        }

        return encrypted;
    }

    /**
     * Decrypt trading data
     */
    static decryptTradingData(data: any): any {
        const decrypted = { ...data };

        // Decrypt symbol if present
        if (decrypted.encryptedSymbol && decrypted.symbolKey && decrypted.symbolIv) {
            decrypted.symbol = this.decryptWithAES({
                data: decrypted.encryptedSymbol,
                key: decrypted.symbolKey,
                iv: decrypted.symbolIv,
            });
        }

        // Decrypt price if present
        if (decrypted.encryptedPrice && decrypted.priceKey && decrypted.priceIv) {
            decrypted.price = parseFloat(this.decryptWithAES({
                data: decrypted.encryptedPrice,
                key: decrypted.priceKey,
                iv: decrypted.priceIv,
            }));
        }

        // Decrypt quantity if present
        if (decrypted.encryptedQuantity && decrypted.quantityKey && decrypted.quantityIv) {
            decrypted.quantity = parseFloat(this.decryptWithAES({
                data: decrypted.encryptedQuantity,
                key: decrypted.quantityKey,
                iv: decrypted.quantityIv,
            }));
        }

        return decrypted;
    }

    /**
     * Hash password with salt
     */
    static hashPassword(password: string): string {
        const salt = CryptoJS.lib.WordArray.random(16).toString();
        const hash = CryptoJS.PBKDF2(password, salt, {
            keySize: 64 / 4,
            iterations: 1000,
        });
        return `${salt}:${hash.toString()}`;
    }

    /**
     * Verify password against hash
     */
    static verifyPassword(password: string, hash: string): boolean {
        const [salt, hashedPassword] = hash.split(':');
        const hashToVerify = CryptoJS.PBKDF2(password, salt, {
            keySize: 64 / 4,
            iterations: 1000,
        });
        return hashToVerify.toString() === hashedPassword;
    }

    /**
     * Generate a secure random token
     */
    static generateSecureToken(length: number = 32): string {
        return CryptoJS.lib.WordArray.random(length).toString();
    }

    /**
     * Encrypt data for local storage
     */
    static encryptForStorage(data: any, key: string): string {
        const encrypted = this.encryptWithAES(JSON.stringify(data), key);
        return JSON.stringify(encrypted);
    }

    /**
     * Decrypt data from local storage
     */
    static decryptFromStorage(encryptedData: string, key: string): any {
        const encrypted = JSON.parse(encryptedData);
        const decrypted = this.decryptWithAES(encrypted);
        return JSON.parse(decrypted);
    }
}
