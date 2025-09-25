'use client';

import { useState, useEffect } from 'react';
import { tradesAPI } from '@/lib/api';
import { RefreshCw, Clock } from 'lucide-react';

interface Trade {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    timestamp: string;
    orderId?: string;
}

export default function TradeHistory() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(false);
    const [symbol, setSymbol] = useState('BTC-USD');
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        const fetchTrades = async () => {
            setLoading(true);
            try {
                const response = await tradesAPI.getTrades({ symbol, limit });
                setTrades(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch trades:', error);
                setTrades([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, [symbol, limit]);

    const refreshTrades = async () => {
        setLoading(true);
        try {
            const response = await tradesAPI.getTrades({ symbol, limit });
            setTrades(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch trades:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => `$${price?.toFixed(2)}`;
    const formatQuantity = (quantity: number) => quantity.toFixed(8);
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Trade History</h3>
                    <button
                        onClick={refreshTrades}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="mt-2 flex space-x-4">
                    <div>
                        <label htmlFor="symbol" className="block text-xs font-medium text-gray-700">
                            Symbol
                        </label>
                        <select
                            id="symbol"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="BTC-USD">BTC-USD</option>
                            <option value="ETH-USD">ETH-USD</option>
                            <option value="SOL-USD">SOL-USD</option>
                            <option value="ADA-USD">ADA-USD</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="limit" className="block text-xs font-medium text-gray-700">
                            Limit
                        </label>
                        <select
                            id="limit"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading trades...</p>
                    </div>
                ) : trades.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-1" />
                                            Time
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Symbol
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Side
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trade ID
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                            {formatTime(trade.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {trade.symbol}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${trade.side === 'BUY'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatQuantity(trade.quantity)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatPrice(trade.price)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatPrice(trade.quantity * trade.price)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {trade.id.substring(0, 8)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No trades found for {symbol}</p>
                        <button
                            onClick={refreshTrades}
                            className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm"
                        >
                            Try again
                        </button>
                    </div>
                )}
            </div>

            {trades.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-700">
                        Showing {trades.length} trades for {symbol}
                    </p>
                </div>
            )}
        </div>
    );
}
