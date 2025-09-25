import { ApiProperty } from '@nestjs/swagger';

export class TradeResponseDto {
    @ApiProperty({ example: 1, description: 'Trade ID' })
    id: number;

    @ApiProperty({ example: 1, description: 'Buy order ID', required: false })
    buyOrderId?: number;

    @ApiProperty({ example: 2, description: 'Sell order ID', required: false })
    sellOrderId?: number;

    @ApiProperty({ example: 50000, description: 'Trade price' })
    price: number;

    @ApiProperty({ example: 1, description: 'Trade quantity' })
    quantity: number;

    @ApiProperty({ example: 1, description: 'Buyer user ID', required: false })
    buyerUserId?: number;

    @ApiProperty({ example: 2, description: 'Seller user ID', required: false })
    sellerUserId?: number;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'Trade execution timestamp' })
    executedAt: string;
}

export class TradeHistoryResponseDto {
    @ApiProperty({ description: 'Trade history', type: [TradeResponseDto] })
    trades: TradeResponseDto[];

    @ApiProperty({ description: 'Pagination information' })
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
