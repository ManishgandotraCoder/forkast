'use client';

import { useState, useEffect } from 'react';
import { ordersAPI, portfolioAPI } from '@/lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function OrderForm() {
    const [orderData, setOrderData] = useState({
        symbol: 'BTC-USD',
        side: 'BUY' as 'BUY' | 'SELL',
        type: 'LIMIT' as 'MARKET' | 'LIMIT',
        quantity: '',
        price: '',
        clientOrderId: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [balances, setBalances] = useState<{ asset: string; available: number; locked: number; total: number }[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(false);

    // Fetch user balances
    useEffect(() => {
        const fetchBalances = async () => {
            setLoadingBalances(true);
            try {
                const response = await portfolioAPI.getBalances();
                setBalances(response.data.balances);
            } catch (error) {
                console.error('Failed to fetch balances:', error);
                setBalances([]);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, []);

    // Get available balance for the base asset (what we're selling)
    const getAvailableBalance = () => {
        const baseAsset = orderData.symbol.split('-')[0]; // Extract base asset (e.g., 'BTC' from 'BTC-USD')
        const balance = balances.find(b => b.asset === baseAsset);
        return balance ? balance.available : 0;
    };

    const availableBalance = getAvailableBalance();

    const validateForm = () => {
        if (!orderData.quantity || parseFloat(orderData.quantity) <= 0) {
            setMessage({ type: 'error', text: 'Quantity must be greater than 0' });
            return false;
        }

        // Only validate price for limit orders
        if (orderData.type === 'LIMIT' && (!orderData.price || parseFloat(orderData.price) <= 0)) {
            setMessage({ type: 'error', text: 'Price must be greater than 0 for limit orders' });
            return false;
        }

        // For sell orders, check if user has enough balance
        if (orderData.side === 'SELL') {
            const requestedQuantity = parseFloat(orderData.quantity) || 0;
            const available = getAvailableBalance();

            if (requestedQuantity > available) {
                const baseAsset = orderData.symbol.split('-')[0];
                setMessage({ type: 'error', text: `Insufficient balance. Available: ${available.toFixed(8)} ${baseAsset}` });
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form before submitting
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await ordersAPI.placeOrder({
                symbol: orderData.symbol,
                side: orderData.side,
                type: orderData.type,
                quantity: orderData.quantity,
                timeInForce: orderData.type === 'MARKET' ? 'IOC' : 'GTC',
                ...(orderData.type === 'LIMIT' && { price: orderData.price }),
                clientOrderId: orderData.clientOrderId || undefined,
            });

            setMessage({ type: 'success', text: `Order placed successfully! Order ID: ${response.data.data.orderId}` });

            // Reset form
            setOrderData({
                symbol: orderData.symbol,
                side: orderData.side,
                type: orderData.type,
                quantity: '',
                price: '',
                clientOrderId: '',
            });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to place order' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Place Order</h3>

            {message && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
                        Symbol
                    </label>
                    <select
                        id="symbol"
                        value={orderData.symbol}
                        onChange={(e) => setOrderData({ ...orderData, symbol: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="BTC-USD">BTC-USD</option>
                        <option value="ETH-USD">ETH-USD</option>
                        <option value="SOL-USD">SOL-USD</option>
                        <option value="ADA-USD">ADA-USD</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buy/Sell</label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => setOrderData({ ...orderData, side: 'BUY' })}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium ${orderData.side === 'BUY'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            BUY
                        </button>
                        <button
                            type="button"
                            onClick={() => setOrderData({ ...orderData, side: 'SELL' })}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium ${orderData.side === 'SELL'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <TrendingDown className="h-4 w-4 mr-1" />
                            SELL
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => setOrderData({ ...orderData, type: 'LIMIT' })}
                            className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'LIMIT'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Limit
                        </button>
                        <button
                            type="button"
                            onClick={() => setOrderData({ ...orderData, type: 'MARKET' })}
                            className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'MARKET'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Market
                        </button>
                    </div>
                    {orderData.type === 'MARKET' && (
                        <p className="mt-1 text-xs text-gray-500">
                            Market orders execute immediately at the best available price
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Quantity
                            {orderData.side === 'SELL' && (
                                <span className="ml-2 text-sm text-gray-500">
                                    (Available: {loadingBalances ? 'Loading...' : `${availableBalance.toFixed(8)} ${orderData.symbol.split('-')[0]}`})
                                </span>
                            )}
                        </label>
                        <input
                            type="number"
                            id="quantity"
                            required
                            step="0.00000001"
                            min="0"
                            placeholder="0.00000000"
                            value={orderData.quantity}
                            onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {orderData.side === 'SELL' && !loadingBalances && (
                            <div className="mt-2 flex justify-between text-xs text-gray-500">
                                <button
                                    type="button"
                                    onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.25).toFixed(8) })}
                                    className="hover:text-indigo-600"
                                >
                                    25%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.5).toFixed(8) })}
                                    className="hover:text-indigo-600"
                                >
                                    50%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.75).toFixed(8) })}
                                    className="hover:text-indigo-600"
                                >
                                    75%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderData({ ...orderData, quantity: availableBalance.toFixed(8) })}
                                    className="hover:text-indigo-600"
                                >
                                    Max
                                </button>
                            </div>
                        )}
                    </div>

                    {orderData.type === 'LIMIT' && (
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                Price (USD)
                            </label>
                            <input
                                type="number"
                                id="price"
                                required
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={orderData.price}
                                onChange={(e) => setOrderData({ ...orderData, price: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="clientOrderId" className="block text-sm font-medium text-gray-700">
                        Client Order ID (Optional)
                    </label>
                    <input
                        type="text"
                        id="clientOrderId"
                        placeholder="Custom order identifier"
                        value={orderData.clientOrderId}
                        onChange={(e) => setOrderData({ ...orderData, clientOrderId: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${orderData.side === 'BUY'
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? 'Placing Order...' : `${orderData.side} ${orderData.symbol}`}
                </button>
            </form>
        </div>
    );
}
