import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EncryptionService } from '../modules/crypto/encryption.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionMiddleware implements NestMiddleware {
    private readonly logger = new Logger(EncryptionMiddleware.name);

    constructor(
        private encryptionService: EncryptionService,
        private configService: ConfigService,
    ) { }

    use(req: Request, res: Response, next: NextFunction) {
        const enableEncryption = this.configService.get<boolean>('encryption.enableEncryption');

        if (!enableEncryption) {
            return next();
        }

        // Skip encryption for certain endpoints
        const skipEncryptionPaths = [
            '/encryption/public-key',
            '/health',
            '/api',
        ];

        if (skipEncryptionPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Encrypt sensitive data in request body
        if (req.body && this.shouldEncryptData(req.path, req.method)) {
            try {
                req.body = this.encryptRequestBody(req.body);
                this.logger.debug('Request body encrypted');
            } catch (error) {
                this.logger.error('Failed to encrypt request body:', error);
            }
        }

        // Intercept response to decrypt sensitive data
        const originalJson = res.json;
        res.json = function (body: any) {
            try {
                const decryptedBody = this.decryptResponseBody(body);
                return originalJson.call(this, decryptedBody);
            } catch (error) {
                this.logger.error('Failed to decrypt response body:', error);
                return originalJson.call(this, body);
            }
        }.bind(this);

        next();
    }

    private shouldEncryptData(path: string, method: string): boolean {
        const encryptPaths = [
            '/user/register',
            '/user/login',
            '/orderbook/place-order',
            '/balance',
        ];

        return encryptPaths.some(encryptPath => path.startsWith(encryptPath)) &&
            ['POST', 'PUT', 'PATCH'].includes(method);
    }

    private encryptRequestBody(body: any): any {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const encrypted = { ...body };

        // Encrypt user data
        if (encrypted.email) {
            encrypted.email = this.encryptionService.encryptWithRSA(
                encrypted.email,
                this.encryptionService.getPublicKey()
            );
        }

        if (encrypted.name) {
            encrypted.name = this.encryptionService.encryptWithRSA(
                encrypted.name,
                this.encryptionService.getPublicKey()
            );
        }

        // Encrypt trading data
        if (encrypted.symbol) {
            const encryptedSymbol = this.encryptionService.encryptWithAES(encrypted.symbol);
            encrypted.symbol = encryptedSymbol.data;
            encrypted.symbolKey = encryptedSymbol.key;
            encrypted.symbolIv = encryptedSymbol.iv;
        }

        if (encrypted.price) {
            const encryptedPrice = this.encryptionService.encryptWithAES(encrypted.price.toString());
            encrypted.price = encryptedPrice.data;
            encrypted.priceKey = encryptedPrice.key;
            encrypted.priceIv = encryptedPrice.iv;
        }

        if (encrypted.quantity) {
            const encryptedQuantity = this.encryptionService.encryptWithAES(encrypted.quantity.toString());
            encrypted.quantity = encryptedQuantity.data;
            encrypted.quantityKey = encryptedQuantity.key;
            encrypted.quantityIv = encryptedQuantity.iv;
        }

        return encrypted;
    }

    private decryptResponseBody(body: any): any {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const decrypted = { ...body };

        // Decrypt user data
        if (decrypted.email) {
            try {
                decrypted.email = this.encryptionService.decryptWithRSA(
                    decrypted.email,
                    this.encryptionService.getPublicKey() // In production, use private key from secure storage
                );
            } catch (error) {
                this.logger.warn('Failed to decrypt email in response');
            }
        }

        if (decrypted.name) {
            try {
                decrypted.name = this.encryptionService.decryptWithRSA(
                    decrypted.name,
                    this.encryptionService.getPublicKey()
                );
            } catch (error) {
                this.logger.warn('Failed to decrypt name in response');
            }
        }

        // Decrypt trading data
        if (decrypted.symbol && decrypted.symbolKey && decrypted.symbolIv) {
            try {
                decrypted.symbol = this.encryptionService.decryptWithAES({
                    data: decrypted.symbol,
                    key: decrypted.symbolKey,
                    iv: decrypted.symbolIv,
                });
            } catch (error) {
                this.logger.warn('Failed to decrypt symbol in response');
            }
        }

        if (decrypted.price && decrypted.priceKey && decrypted.priceIv) {
            try {
                decrypted.price = parseFloat(this.encryptionService.decryptWithAES({
                    data: decrypted.price,
                    key: decrypted.priceKey,
                    iv: decrypted.priceIv,
                }));
            } catch (error) {
                this.logger.warn('Failed to decrypt price in response');
            }
        }

        if (decrypted.quantity && decrypted.quantityKey && decrypted.quantityIv) {
            try {
                decrypted.quantity = parseFloat(this.encryptionService.decryptWithAES({
                    data: decrypted.quantity,
                    key: decrypted.quantityKey,
                    iv: decrypted.quantityIv,
                }));
            } catch (error) {
                this.logger.warn('Failed to decrypt quantity in response');
            }
        }

        return decrypted;
    }
}
