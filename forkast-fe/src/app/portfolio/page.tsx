'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { portfolioAPI } from '@/lib/api';
import {
    Wallet,
} from 'lucide-react';

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


const Portfolio: React.FC = () => {
    const { cryptoPrices } = useWebSocket();
    const [balances, setBalances] = useState<Balance[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    console.log(cryptoPrices);

    // Fetch user balances
    const fetchBalances = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await portfolioAPI.getBalances();
            // Map the response to match the expected Balance interface
            const mappedBalances = response.data.balances.map((balance: { symbol: string; amount: number; locked: number; costPrice: number | null; createdAt: string; updatedAt: string }) => ({
                id: 0, // Not provided by backend
                userId: 0, // Not provided by backend
                symbol: balance.symbol,
                amount: balance.amount,
                locked: balance.locked,
                costPrice: balance.costPrice,
                createdAt: balance.createdAt,
                updatedAt: balance.updatedAt,
            }));
            setBalances(mappedBalances);
        } catch (err: unknown) {
            console.error('Failed to fetch balances:', err);
            const errorMessage = err instanceof Error && 'response' in err &&
                typeof err.response === 'object' && err.response !== null &&
                'data' in err.response && typeof err.response.data === 'object' &&
                err.response.data !== null && 'message' in err.response.data
                ? (err.response.data as { message: string }).message
                : 'Failed to fetch portfolio data';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch balances on component mount
    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);


    const formatPrice = (price: number) => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `$${price.toFixed(6)}`;
        }
    };


    const formatChange = (change: number, isPercent: boolean = false) => {
        const formatted = isPercent ? `${Math.abs(change).toFixed(2)}%` : `$${Math.abs(change).toFixed(2)}`;
        return change >= 0 ? `+${formatted}` : `-${formatted}`;
    };

    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-600';
        if (change < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    // Filter balances to only show non-zero holdings and exclude USD
    const filteredBalances = balances.filter(balance =>
        balance.amount > 0 && balance.symbol !== 'USD'
    );

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">My Portfolio</h2>
                </div>

            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-red-800">{error}</span>
                </div>
            )}

            {/* Holdings Table */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading portfolio...</p>
                </div>
            ) : filteredBalances.length === 0 ? (
                <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Crypto Holdings</h3>
                    <p className="text-gray-600 mb-4">You don&apos;t have any cryptocurrency holdings yet.</p>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Start Trading
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                        {/* Table Header */}
                        <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm">
                            <div>Currency</div>
                            <div className="text-right">Count</div>
                            <div className="text-right">Buy Price</div>
                            <div className="text-right">Current Price</div>
                            <div className="text-right">Purchased At</div>
                            <div className="text-right">P&L</div>
                        </div>

                        {/* Table Body */}
                        <div className="space-y-2 mt-2">
                            {filteredBalances.map((balance) => {
                                const cryptoPrice = cryptoPrices.find(p => p.symbol === balance.symbol);

                                const currentPrice = cryptoPrice ? cryptoPrice.price : 0;
                                const buyPrice = balance.costPrice || 0;
                                const amount = balance.amount;
                                const pnl = currentPrice && buyPrice ? (currentPrice - buyPrice) * amount : 0;
                                const pnlPercent = buyPrice ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;

                                return (
                                    <div
                                        key={balance.symbol}
                                        className="grid grid-cols-6 gap-4 px-4 py-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                        {/* Currency */}
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {balance.symbol.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {balance.symbol}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {cryptoPrice?.shortName || balance.symbol}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Count (Amount) */}
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">
                                                {amount?.toFixed(2)}
                                            </div>
                                            {balance.locked > 0 && (
                                                <div className="text-xs text-orange-600">
                                                    Locked: {balance.locked.toFixed(2)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Buy Price */}
                                        <div className="text-right">
                                            {buyPrice > 0 ? (
                                                <div className="font-semibold text-gray-900">
                                                    {formatPrice(buyPrice)}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">--</div>
                                            )}
                                        </div>

                                        {/* Current Price */}
                                        <div className="text-right">
                                            {cryptoPrice ? (
                                                <div className="font-semibold text-gray-900">
                                                    {formatPrice(currentPrice)}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">Loading...</div>
                                            )}
                                        </div>

                                        {/* Purchased At */}
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">
                                                {new Date(balance.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(balance.createdAt).toLocaleTimeString()}
                                            </div>
                                        </div>

                                        {/* P&L */}
                                        <div className="text-right">
                                            {cryptoPrice && buyPrice > 0 ? (
                                                <>
                                                    <div className={`font-semibold ${getChangeColor(pnl)}`}>
                                                        {formatChange(pnl)}
                                                    </div>
                                                    <div className={`text-xs ${getChangeColor(pnlPercent)}`}>
                                                        {formatChange(pnlPercent, true)}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-gray-500">--</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Portfolio;
