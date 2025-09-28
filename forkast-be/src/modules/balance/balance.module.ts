import { Module } from '@nestjs/common';
import { BalanceController } from './balance.controller';
import { PrismaService } from '../../prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
        }),
    ],
    controllers: [BalanceController],
    providers: [PrismaService],
})
export class BalanceModule { }
