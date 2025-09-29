import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('encryption')
export class EncryptionController {
    constructor(private readonly encryptionService: EncryptionService) { }

    @Get('public-key')
    getPublicKey() {
        return {
            publicKey: this.encryptionService.getPublicKey(),
        };
    }

    @Post('encrypt')
    @UseGuards(JwtAuthGuard)
    encryptData(@Body() data: { data: string; type: 'rsa' | 'aes' }) {
        if (data.type === 'rsa') {
            return {
                encrypted: this.encryptionService.encryptWithRSA(
                    data.data,
                    this.encryptionService.getPublicKey()
                ),
            };
        } else {
            const encrypted = this.encryptionService.encryptWithAES(data.data);
            return {
                encrypted: encrypted.data,
                key: encrypted.key,
                iv: encrypted.iv,
            };
        }
    }

    @Post('decrypt')
    @UseGuards(JwtAuthGuard)
    decryptData(@Body() data: { encrypted: string; type: 'rsa' | 'aes'; key?: string; iv?: string }) {
        if (data.type === 'rsa') {
            return {
                decrypted: this.encryptionService.decryptWithRSA(
                    data.encrypted,
                    this.encryptionService.getPublicKey() // In production, use private key from secure storage
                ),
            };
        } else {
            return {
                decrypted: this.encryptionService.decryptWithAES({
                    data: data.encrypted,
                    key: data.key || this.encryptionService['aesKey'],
                    iv: data.iv || '',
                }),
            };
        }
    }
}
