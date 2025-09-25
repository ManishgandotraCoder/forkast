export interface Order {
    orderId: string;
    clientOrderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIAL';
    price: string;
    originalQuantity: string;
    filledQuantity: string;
    remainingQuantity: string;
    avgFillPrice?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BackendOrder {
    id: number;
    userId: number;
    type: string;
    symbol: string;
    price: number;
    quantity: number;
    filledQuantity: number;
    status: string;
    market: boolean;
    createdAt: string;
    updatedAt: string;
}