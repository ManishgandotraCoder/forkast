'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { portfolioAPI } from '@/lib/api';
import {
    Wallet,
    RefreshCw
} from 'lucide-react';

interface Balance {
    asset: string;
    available: number;
    locked: number;
    total: number;
}

const Portfolio: React.FC = () => {
    const { cryptoPrices } = useWebSocket();
    const [balances, setBalances] = useState<Balance[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    console.log(balances);

    // Fetch user balances
    const fetchBalances = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await portfolioAPI.getBalances();
            setBalances(response.data.balances);
            setLastUpdated(new Date());
        } catch (err: any) {
            console.error('Failed to fetch balances:', err);
            setError(err.response?.data?.message || 'Failed to fetch portfolio data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Calculate portfolio statistics
    const calculatePortfolioStats = useCallback(() => {
        if (!balances.length || !cryptoPrices.length) {
            setPortfolioStats({
                totalValue: 0,
                totalChange: 0,
                totalChangePercent: 0,
                assetCount: 0
            });
            return;
        }

        let totalValue = 0;
        let totalChange = 0;
        let totalChangePercent = 0;
        let assetCount = 0;

        balances.forEach(balance => {
            if (balance.total > 0) {
                const symbol = `${balance.asset}-USD`;
                const cryptoPrice = cryptoPrices.find(p => p.symbol === symbol);

                if (cryptoPrice) {
                    const value = balance.total * cryptoPrice.price;
                    totalValue += value;

                    // For simplicity, we'll use the current price change percentage
                    // In a real app, you'd want to track the original purchase price
                    const changeValue = value * (cryptoPrice.regularMarketChangePercent / 100);
                    totalChange += changeValue;

                    assetCount++;
                }
            }
        });

        totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

        setPortfolioStats({
            totalValue,
            totalChange,
            totalChangePercent,
            assetCount
        });
    }, [balances, cryptoPrices]);

    // Fetch balances on component mount
    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    // Recalculate stats when balances or prices change
    useEffect(() => {
        calculatePortfolioStats();
    }, [calculatePortfolioStats]);

    const formatPrice = (price: number) => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `$${price.toFixed(6)}`;
        }
    };

    const formatValue = (value: number) => {
        if (value >= 1e9) {
            return `$${(value / 1e9).toFixed(2)}B`;
        } else if (value >= 1e6) {
            return `$${(value / 1e6).toFixed(2)}M`;
        } else if (value >= 1e3) {
            return `$${(value / 1e3).toFixed(2)}K`;
        } else {
            return `$${value.toFixed(2)}`;
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

    const getChangeBgColor = (change: number) => {
        if (change > 0) return 'bg-green-50';
        if (change < 0) return 'bg-red-50';
        return 'bg-gray-50';
    };

    // Filter balances to only show non-zero holdings

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">My Crypto Portfolio</h2>
                </div>

                <div className="flex items-center space-x-3">
                    {lastUpdated && (
                        <div className="text-sm text-gray-500">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                    <button
                        onClick={fetchBalances}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
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
            ) : balances.length === 0 ? (
                <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Crypto Holdings</h3>
                    <p className="text-gray-600 mb-4">You don't have any cryptocurrency holdings yet.</p>
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
                            <div className="col-span-2">Asset</div>
                            <div className="text-right">Balance</div>
                            <div className="text-right">Price</div>
                            <div className="text-right">Value</div>
                            <div className="text-right">24h Change</div>
                        </div>

                        {/* Table Body */}
                        <div className="space-y-2 mt-2">
                            {balances.map((balance) => {
                                const symbol = `${balance.asset}-USD`;
                                const cryptoPrice = cryptoPrices.find(p => p.symbol === symbol);
                                const value = cryptoPrice ? balance.total * cryptoPrice.price : 0;

                                return (
                                    <div
                                        key={balance.asset}
                                        className="grid grid-cols-6 gap-4 px-4 py-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                        {/* Asset */}
                                        <div className="col-span-2 flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {balance.asset.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {balance.asset}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {cryptoPrice?.shortName || balance.asset}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Balance */}
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">
                                                {balance.total.toFixed(8)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Available: {balance.available.toFixed(8)}
                                            </div>
                                            {balance.locked > 0 && (
                                                <div className="text-xs text-orange-600">
                                                    Locked: {balance.locked.toFixed(8)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            {cryptoPrice ? (
                                                <div className="font-semibold text-gray-900">
                                                    {formatPrice(cryptoPrice.price)}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">Loading...</div>
                                            )}
                                        </div>

                                        {/* Value */}
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">
                                                {formatValue(value)}
                                            </div>
                                        </div>

                                        {/* 24h Change */}
                                        <div className="text-right">
                                            {cryptoPrice ? (
                                                <>
                                                    <div className={`font-semibold ${getChangeColor(cryptoPrice.regularMarketChangePercent)}`}>
                                                        {formatChange(cryptoPrice.regularMarketChangePercent, true)}
                                                    </div>
                                                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${getChangeBgColor(cryptoPrice.regularMarketChangePercent)} ${getChangeColor(cryptoPrice.regularMarketChangePercent)}`}>
                                                        {cryptoPrice.regularMarketChangePercent >= 0 ? '↗' : '↘'}
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

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center text-sm text-gray-500">
                    <p>Portfolio values are updated in real-time based on current market prices.</p>
                    <p className="mt-1">Historical performance tracking coming soon.</p>
                </div>
            </div>
        </div>
    );
};

export default Portfolio;
