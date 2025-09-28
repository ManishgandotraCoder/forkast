import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsdProfileController } from './usd-profile.controller';
import { UsdProfileService } from './usd-profile.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: configService.get('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsdProfileController],
  providers: [UsdProfileService, PrismaService],
  exports: [UsdProfileService],
})
export class UsdProfileModule { }
