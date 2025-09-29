'use client';

import { useState, useEffect, useCallback } from 'react';
import { ordersAPI, portfolioAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

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
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [priceValidation, setPriceValidation] = useState<{ isValid: boolean; message: string } | null>(null);

    // Fetch user balances
    useEffect(() => {
        const fetchBalances = async () => {
            setLoadingBalances(true);
            try {
                const response = await portfolioAPI.getBalances();
                setBalances(response.data.balances.map((balance: { symbol: string; amount: number; locked: number }) => ({
                    asset: balance.symbol,
                    available: balance.amount,
                    locked: balance.locked,
                    total: balance.amount + balance.locked
                })));
            } catch (error) {
                console.error('Failed to fetch balances:', error);
                setBalances([]);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, []);

    // Fetch current price for the selected symbol
    useEffect(() => {
        const fetchCurrentPrice = async () => {
            setLoadingPrice(true);
            try {
                const response = await fetch(`/api/crypto/${orderData.symbol}`);
                if (response.ok) {
                    const data = await response.json();
                    setCurrentPrice(data.regularMarketPrice || data.price);
                } else {
                    console.error('Failed to fetch current price');
                    setCurrentPrice(null);
                }
            } catch (error) {
                console.error('Failed to fetch current price:', error);
                setCurrentPrice(null);
            } finally {
                setLoadingPrice(false);
            }
        };

        fetchCurrentPrice();
    }, [orderData.symbol]);

    // Get available balance for the base asset (what we're selling)
    const getAvailableBalance = () => {
        const baseAsset = orderData.symbol.split('-')[0]; // Extract base asset (e.g., 'BTC' from 'BTC-USD')
        const balance = balances.find(b => b.asset === baseAsset);
        return balance ? balance.available : 0;
    };

    const availableBalance = getAvailableBalance();

    // Memoized handlers to prevent re-renders
    const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setOrderData(prev => ({ ...prev, quantity: e.target.value }));
    }, []);

    const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setOrderData(prev => ({ ...prev, price: e.target.value }));
    }, []);

    const handlePercentageClick = useCallback((percentage: number) => {
        setOrderData(prev => ({
            ...prev,
            quantity: (availableBalance * percentage).toFixed(8)
        }));
    }, [availableBalance]);

    // Validate price against current market price
    const validatePrice = (price: string) => {
        if (!price || !currentPrice) {
            setPriceValidation(null);
            return;
        }

        const orderPrice = parseFloat(price);
        const tolerance = 0.01; // 1% tolerance for price matching

        if (Math.abs(orderPrice - currentPrice) / currentPrice <= tolerance) {
            setPriceValidation({
                isValid: true,
                message: `Price matches current market price (${currentPrice.toFixed(2)})`
            });
        }
    };

    // Validate price when it changes
    useEffect(() => {
        if (orderData.type === 'LIMIT' && orderData.price) {
            validatePrice(orderData.price);
        } else {
            setPriceValidation(null);
        }
    }, [orderData.price, orderData.type, currentPrice]);

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

            {/* Current Price Display */}
            {currentPrice && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium text-blue-900">Current Market Price:</span>
                            <span className="ml-2 text-lg font-bold text-blue-900">${currentPrice.toFixed(2)}</span>
                        </div>
                        {orderData.type === 'LIMIT' && (
                            <button
                                type="button"
                                onClick={() => setOrderData({ ...orderData, price: currentPrice.toFixed(2) })}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                            >
                                Use Current Price
                            </button>
                        )}
                    </div>
                </div>
            )}

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
                            onChange={handleQuantityChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {orderData.side === 'SELL' && !loadingBalances && (
                            <div className="mt-2 flex justify-between text-xs text-gray-500">
                                <button
                                    type="button"
                                    onClick={() => handlePercentageClick(0.25)}
                                    className="hover:text-indigo-600"
                                >
                                    25%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePercentageClick(0.5)}
                                    className="hover:text-indigo-600"
                                >
                                    50%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePercentageClick(0.75)}
                                    className="hover:text-indigo-600"
                                >
                                    75%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePercentageClick(1)}
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
                                {currentPrice && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        (Current: ${currentPrice.toFixed(2)})
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    id="price"
                                    required
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={orderData.price}
                                    onChange={handlePriceChange}
                                    className={`mt-1 block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none sm:text-sm ${priceValidation?.isValid === true
                                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                        : priceValidation?.isValid === false
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                                        }`}
                                />
                                {priceValidation && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        {priceValidation.isValid ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {priceValidation && (
                                <div className={`mt-1 text-xs flex items-center ${priceValidation.isValid ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {priceValidation.isValid ? (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                    ) : (
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                    )}
                                    {priceValidation.message}
                                </div>
                            )}
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
                    disabled={loading || (orderData.type === 'LIMIT' && priceValidation?.isValid === false)}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${orderData.side === 'BUY'
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? 'Placing Order...' :
                        (orderData.type === 'LIMIT' && priceValidation?.isValid === false) ? 'Price Must Match Market Price' :
                            `${orderData.side} ${orderData.symbol}`}
                </button>
            </form>
        </div>
    );
}
