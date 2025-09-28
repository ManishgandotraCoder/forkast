import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrderbookController } from './orderbook.controller';
import { OrderbookService } from './orderbook.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'test-secret',
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [OrderbookController],
  providers: [OrderbookService, PrismaService],
  exports: [OrderbookService],
})
export class OrderbookModule { }
