import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CryptoGateway } from './crypto.gateway';
import { CryptoPriceService } from './crypto-price.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [CryptoGateway, CryptoPriceService],
    exports: [CryptoPriceService],
})
export class WebSocketModule { }
