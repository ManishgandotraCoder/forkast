// DTOs for Buy USDT APIs
import { IsNotEmpty, IsNumber, IsString, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyUsdtDto {
    @ApiProperty({ example: 'USD', description: 'Currency to buy USDT with', enum: ['USD', 'INR'] })
    @IsString()
    @IsIn(['USD', 'INR'])
    currency: string;

    @ApiProperty({ example: 100, description: 'Amount of currency to spend', minimum: 1 })
    @IsNumber()
    @Min(1)
    amount: number;

    @ApiProperty({ example: 1.0, description: 'Exchange rate (currency to USDT)', minimum: 0.001 })
    @IsNumber()
    @Min(0.001)
    exchangeRate: number;
}

export class BuyUsdtResponseDto {
    @ApiProperty({ example: 1, description: 'Transaction ID' })
    id: number;

    @ApiProperty({ example: 'USD', description: 'Currency used' })
    currency: string;

    @ApiProperty({ example: 100, description: 'Amount spent' })
    amountSpent: number;

    @ApiProperty({ example: 100, description: 'USDT received' })
    usdtReceived: number;

    @ApiProperty({ example: 1.0, description: 'Exchange rate used' })
    exchangeRate: number;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'Transaction timestamp' })
    timestamp: string;
}


