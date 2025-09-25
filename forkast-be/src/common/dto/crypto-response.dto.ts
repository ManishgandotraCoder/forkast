import { ApiProperty } from '@nestjs/swagger';

export class CryptoQuoteResponseDto {
    @ApiProperty({ example: 'BTC-USD', description: 'Cryptocurrency symbol' })
    symbol: string;

    @ApiProperty({ example: 50000, description: 'Current price' })
    price: number;

    @ApiProperty({ example: 'Bitcoin USD', description: 'Short name' })
    shortName: string;

    @ApiProperty({ example: 50000, description: 'Regular market price' })
    regularMarketPrice: number;

    @ApiProperty({ example: 1000, description: 'Regular market change' })
    regularMarketChange: number;

    @ApiProperty({ example: 2.04, description: 'Regular market change percentage' })
    regularMarketChangePercent: number;

    @ApiProperty({ example: 950000000000, description: 'Market capitalization' })
    marketCap: number;
}

export class CryptoErrorResponseDto {
    @ApiProperty({ example: 'Failed to fetch quote', description: 'Error message' })
    error: string;
}
