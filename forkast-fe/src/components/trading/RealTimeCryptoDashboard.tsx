'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
    Wifi,
    WifiOff,
    Activity
} from 'lucide-react';


const RealTimeCryptoDashboard: React.FC = () => {
    const {
        isConnected,
        cryptoPrices,
        subscribeToCryptoPrices,
        unsubscribeFromCryptoPrices,
        error
    } = useWebSocket();

    const [sortBy, setSortBy] = useState<'price' | 'change' | 'marketCap'>('marketCap');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (isConnected) {
            subscribeToCryptoPrices();
        }

        return () => {
            unsubscribeFromCryptoPrices();
        };
    }, [isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices]);

    const formatPrice = (price: number) => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `$${price.toFixed(6)}`;
        }
    };

    const formatMarketCap = (marketCap: number) => {
        if (marketCap >= 1e12) {
            return `$${(marketCap / 1e12).toFixed(2)}T`;
        } else if (marketCap >= 1e9) {
            return `$${(marketCap / 1e9).toFixed(2)}B`;
        } else if (marketCap >= 1e6) {
            return `$${(marketCap / 1e6).toFixed(2)}M`;
        } else {
            return `$${marketCap.toLocaleString()}`;
        }
    };

    const formatChange = (change: number, isPercent: boolean = false) => {
        const formatted = isPercent ? `${change.toFixed(2)}%` : `$${Math.abs(change).toFixed(2)}`;
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

    const sortedAndFilteredPrices = cryptoPrices
        .filter(crypto =>
            crypto.symbol.toLowerCase().includes(filter.toLowerCase()) ||
            crypto.shortName.toLowerCase().includes(filter.toLowerCase())
        )
        .sort((a, b) => {
            let aValue: number, bValue: number;

            switch (sortBy) {
                case 'price':
                    aValue = a.price;
                    bValue = b.price;
                    break;
                case 'change':
                    aValue = a.regularMarketChangePercent;
                    bValue = b.regularMarketChangePercent;
                    break;
                case 'marketCap':
                    aValue = a.marketCap;
                    bValue = b.marketCap;
                    break;
                default:
                    return 0;
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

    const getLastUpdateTime = () => {
        if (cryptoPrices.length === 0) return null;
        const latestTimestamp = Math.max(...cryptoPrices.map(p => p.timestamp));
        return new Date(latestTimestamp).toLocaleTimeString();
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <Activity className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Real-Time Crypto Prices</h2>
                    <div className="flex items-center space-x-2">
                        {isConnected ? (
                            <div className="flex items-center space-x-1 text-green-600">
                                <Wifi className="h-4 w-4" />
                                <span className="text-sm font-medium">Live</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-1 text-red-600">
                                <WifiOff className="h-4 w-4" />
                                <span className="text-sm font-medium">Disconnected</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-sm text-gray-500">
                    Last updated: {getLastUpdateTime() || 'Never'}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <WifiOff className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search cryptocurrencies..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'price' | 'change' | 'marketCap')}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="marketCap">Market Cap</option>
                        <option value="price">Price</option>
                        <option value="change">24h Change</option>
                    </select>

                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Crypto List */}
            <div className="overflow-x-auto">
                <div className="min-w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm">
                        <div className="col-span-2">Asset</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">24h Change</div>
                        <div className="text-right">Market Cap</div>
                        <div className="text-right">Volume</div>
                    </div>

                    {/* Table Body */}
                    <div className="space-y-2 mt-2">
                        {sortedAndFilteredPrices.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {isConnected ? 'No cryptocurrencies found' : 'Connecting to real-time data...'}
                            </div>
                        ) : (
                            sortedAndFilteredPrices.map((crypto) => (
                                <div
                                    key={crypto.symbol}
                                    className="grid grid-cols-6 gap-4 px-4 py-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                >
                                    {/* Asset */}
                                    <div className="col-span-2 flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {crypto.symbol.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {crypto.symbol.replace('-USD', '')}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {crypto.shortName}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            {formatPrice(crypto.price)}
                                        </div>
                                        {crypto.previousPrice && (
                                            <div className="text-xs text-gray-500">
                                                Prev: {formatPrice(crypto.previousPrice)}
                                            </div>
                                        )}
                                    </div>

                                    {/* 24h Change */}
                                    <div className="text-right">
                                        <div className={`font-semibold ${getChangeColor(crypto.regularMarketChangePercent)}`}>
                                            {formatChange(crypto.regularMarketChangePercent, true)}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full inline-block ${getChangeBgColor(crypto.regularMarketChangePercent)} ${getChangeColor(crypto.regularMarketChange)}`}>
                                            {formatChange(crypto.regularMarketChange)}
                                        </div>
                                    </div>

                                    {/* Market Cap */}
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            {formatMarketCap(crypto.marketCap)}
                                        </div>
                                    </div>

                                    {/* Volume (simulated) */}
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            ${(Math.random() * 1000000000).toLocaleString('en-US', {
                                                style: 'decimal',
                                                maximumFractionDigits: 0
                                            })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Vol
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-900">
                            {cryptoPrices.length}
                        </div>
                        <div className="text-sm text-gray-500">Assets Tracked</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">
                            {isConnected ? 'Live' : 'Offline'}
                        </div>
                        <div className="text-sm text-gray-500">Connection Status</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">
                            {getLastUpdateTime() || '--:--:--'}
                        </div>
                        <div className="text-sm text-gray-500">Last Update</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimeCryptoDashboard;
