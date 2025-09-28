'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CryptoPriceUpdate {
    symbol: string;
    price: number;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap: number;
    timestamp: number;
    previousPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
}

interface WebSocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    cryptoPrices: CryptoPriceUpdate[];
    subscribeToCryptoPrices: () => void;
    unsubscribeFromCryptoPrices: () => void;
    error: string | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

interface WebSocketProviderProps {
    children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [cryptoPrices, setCryptoPrices] = useState<CryptoPriceUpdate[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const newSocket = io(`${API_BASE_URL}/crypto`, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
            setIsConnected(true);
            setError(null);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('WebSocket connection error:', err);
            setError('Failed to connect to real-time data server');
        });

        newSocket.on('crypto-prices-update', (prices: CryptoPriceUpdate[]) => {
            setCryptoPrices(prices);
        });

        newSocket.on('crypto-price-update', (data: { symbol: string } & CryptoPriceUpdate) => {
            setCryptoPrices(prev => {
                const updated = [...prev];
                const index = updated.findIndex(price => price.symbol === data.symbol);
                if (index !== -1) {
                    updated[index] = data;
                } else {
                    updated.push(data);
                }
                return updated;
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const subscribeToCryptoPrices = useCallback(() => {
        if (socket && isConnected) {
            socket.emit('subscribe-crypto-prices', {});
        }
    }, [socket, isConnected]);

    const unsubscribeFromCryptoPrices = useCallback(() => {
        if (socket && isConnected) {
            socket.emit('unsubscribe-crypto-prices', {});
        }
    }, [socket, isConnected]);

    const value: WebSocketContextType = useMemo(() => ({
        socket,
        isConnected,
        cryptoPrices,
        subscribeToCryptoPrices,
        unsubscribeFromCryptoPrices,
        error,
    }), [socket, isConnected, cryptoPrices, subscribeToCryptoPrices, unsubscribeFromCryptoPrices, error]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
