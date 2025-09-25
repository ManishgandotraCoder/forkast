import { ApiProperty } from '@nestjs/swagger';

export class OrderResponseDto {
    @ApiProperty({ example: 1, description: 'Order ID' })
    id: number;

    @ApiProperty({ example: 1, description: 'User ID who placed the order' })
    userId: number;

    @ApiProperty({ example: 'buy', description: 'Order type (buy or sell)', enum: ['buy', 'sell'] })
    type: string;

    @ApiProperty({ example: 'BTC-USD', description: 'Trading symbol' })
    symbol: string;

    @ApiProperty({ example: 50000, description: 'Order price' })
    price: number;

    @ApiProperty({ example: 1, description: 'Order quantity' })
    quantity: number;

    @ApiProperty({ example: 0, description: 'Filled quantity' })
    filledQuantity: number;

    @ApiProperty({ example: 'open', description: 'Order status', enum: ['open', 'filled', 'cancelled', 'partial'] })
    status: string;

    @ApiProperty({ example: false, description: 'Whether this is a market order' })
    market: boolean;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'Order creation timestamp' })
    createdAt: string;

    @ApiProperty({ example: '2024-01-21T10:30:00.000Z', description: 'Order last update timestamp' })
    updatedAt: string;

    @ApiProperty({ description: 'User information', required: false })
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

export class OrderbookResponseDto {
    @ApiProperty({ description: 'Buy orders', type: [OrderResponseDto] })
    buys: OrderResponseDto[];

    @ApiProperty({ description: 'Sell orders', type: [OrderResponseDto] })
    sells: OrderResponseDto[];

    @ApiProperty({ description: 'Pagination information' })
    pagination: {
        page: number;
        limit: number;
        totalBuys: number;
        totalSells: number;
        totalPages: number;
    };
}

export class MyOrdersResponseDto {
    @ApiProperty({ description: 'User orders', type: [OrderResponseDto] })
    orders: OrderResponseDto[];

    @ApiProperty({ description: 'Pagination information' })
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
