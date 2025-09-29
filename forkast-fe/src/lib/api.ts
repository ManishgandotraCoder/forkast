import axios from 'axios';

// Types for API responses
interface Balance {
    id: number;
    userId: number;
    symbol: string;
    amount: number;
    locked: number;
    costPrice: number | null;
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authAPI = {
    register: (data: {
        email: string;
        password: string;
        name: string;
    }) => api.post('/user/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/user/login', data),

    getProfile: () => api.get('/user/profile'),
};

// Orders API
export const ordersAPI = {
    placeOrder: (data: {
        symbol: string;
        side: 'BUY' | 'SELL';
        type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT';
        quantity: string;
        price?: string;
        stopPrice?: string;
        timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
        clientOrderId?: string;
        expiresAt?: string;
        currentBalance?: number;
        p2p?: boolean;
    }) => {
        console.log(data);

        const endpoint = data.side === 'BUY' ? '/orderbook/buy' : '/orderbook/sell';
        const isMarket = data.type === 'MARKET';
        const orderData = {
            symbol: data.symbol,
            price: parseFloat(data.price || '0'),
            quantity: parseFloat(data.quantity),
            market: isMarket,
            currentBalance: data.currentBalance || 0,
            p2p: data.p2p || false,
        };
        return api.post(endpoint, orderData);
    },

    getOrder: (orderId: string) => api.get(`/orders/${orderId}`),

    getOrders: (params?: {
        symbol?: string;
        side?: 'BUY' | 'SELL';
        status?: string;
        page?: number;
        limit?: number;
    }) => api.get('/orderbook/my-orders', {
        params,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    }),

    cancelOrder: (orderId: string, reason?: string) =>
        api.delete(`/orderbook/cancel/${orderId}`, { params: { reason } }),
};

// Trades API
export const tradesAPI = {
    getTrades: (params: {
        symbol: string;
        page?: number;
        limit?: number;
        since?: string;
    }) => api.get('/orderbook/trades', { params }),

    // Get trade history - this returns all completed trades (executions) for the symbol
    // The backend /trades endpoint returns completed trades when buys and sells matched
    getUserTrades: (params?: {
        symbol?: string;
        page?: number;
        limit?: number;
        since?: string;
    }) => api.get('/orderbook/trades', { params }),
};

// Orderbook API
export const orderbookAPI = {
    // Get current orderbook - returns outstanding buy (bids) and sell (asks) orders
    // that haven't been completely filled
    getOrderbook: (params: {
        symbol?: string;
        page?: number;
        limit?: number;
    }) => api.get('/orderbook', { params }),
};

// Health API
export const healthAPI = {
    getHealth: () => api.get('/'),
};

// Portfolio/Balance API - now uses real backend data
export const portfolioAPI = {
    getBalances: async (): Promise<{ data: { balances: Balance[] } }> => {
        try {
            const response = await api.get('/balance', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            return {
                data: {
                    balances: response.data
                }
            };
        } catch (error) {
            // Fallback to empty balances if API fails
            console.error('Failed to fetch user balances:', error);
            return {
                data: {
                    balances: []
                }
            };
        }
    }
};

// Crypto API
export const cryptoAPI = {
    getBatchQuotes: (symbols?: string) => api.get('/crypto/batch', { params: { symbols } }),

    getSingleQuote: (symbol: string) => api.get(`/crypto/${symbol}`),
};

export default api;
