import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { CryptoModule } from './model/crypto/crypto.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { OrderbookModule } from './model/orderbook/orderbook.module';
import { BalanceModule } from './model/balance/balance.module';
import { WebSocketModule } from './websocket/websocket.module';
import { UsdProfileModule } from './model/user/usd-profile.module';
import { UserModule } from './model/user/user.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    JwtModule.registerAsync({
      useFactory: (configService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: configService.get('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    CryptoModule,
    OrderbookModule,
    BalanceModule,
    WebSocketModule,
    UsdProfileModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
