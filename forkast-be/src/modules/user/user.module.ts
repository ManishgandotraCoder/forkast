import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { BuyUsdtController } from './buy-usdt.controller';
import { BuyUsdtService } from './buy-usdt.service';
import { UsdProfileController } from './usd-profile.controller';
import { UsdProfileService } from './usd-profile.service';
import { PrismaService } from '../../prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
        }),
    ],
    controllers: [UserController, BuyUsdtController, UsdProfileController],
    providers: [UserService, BuyUsdtService, UsdProfileService, PrismaService],
    exports: [UserService, BuyUsdtService, UsdProfileService],
})
export class UserModule { }
