export interface ApiTrade {
    id: number;
    buyOrderId: number | null;
    sellOrderId: number | null;
    price: number;
    quantity: number;
    executedAt: string;
}

export interface Trade {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    value: number;
    fees: number;
    timestamp: string;
    orderId: string;
}