'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { ordersAPI, portfolioAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCryptoSymbols } from '@/lib/useCryptoSymbols';

export default function NewOrderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const orderType = searchParams.get('type') as 'buy' | 'sell' || 'buy';

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    const [formData, setFormData] = useState({
        symbol: 'BTC-USD',
        type: orderType,
        orderType: 'limit' as 'market' | 'limit',
        quantity: '',
        price: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(67543.21); // Mock current price
    const [balances, setBalances] = useState<{ asset: string; available: number; locked: number; total: number }[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(false);

    const { cryptos: cryptoSymbols } = useCryptoSymbols();

    useEffect(() => {
        setFormData(prev => ({ ...prev, type: orderType }));
    }, [orderType]);

    // Fetch user balances
    useEffect(() => {
        const fetchBalances = async () => {
            if (!user) return;

            setLoadingBalances(true);
            try {
                const response = await portfolioAPI.getBalances();
                console.log(response.data.balances);

                setBalances(response.data.balances);
            } catch (error) {
                console.error('Failed to fetch balances:', error);
                setBalances([]);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, [user]);

    const symbols = cryptoSymbols.map(crypto => ({
        value: crypto.symbol,
        label: `${crypto.symbol.replace('-USD', '')} (${crypto.symbol})`,
        price: crypto.price,
    }));

    const selectedSymbol = symbols.find(s => s.value === formData.symbol);

    // Get available balance for a specific asset
    const getAvailableBalance = (asset: string) => {
        const balance = balances.find(b => b.asset === asset);
        return balance ? balance.available : 0;
    };

    const availableBalance = getAvailableBalance(formData.symbol);

    useEffect(() => {
        if (selectedSymbol) {
            setCurrentPrice(selectedSymbol.price);
        }
    }, [selectedSymbol]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Validate symbol format (BASE-QUOTE)
        if (!formData.symbol || !/^[A-Z0-9]+-[A-Z0-9]+$/.test(formData.symbol)) {
            newErrors.symbol = 'Symbol must be in format BASE-QUOTE (e.g., BTC-USD)';
        }

        // Validate quantity as decimal string
        if (!formData.quantity) {
            newErrors.quantity = 'Quantity is required';
        } else if (!/^\d+(\.\d{1,8})?$/.test(formData.quantity)) {
            newErrors.quantity = 'Quantity must be a positive decimal with up to 8 decimal places';
        } else if (parseFloat(formData.quantity) <= 0) {
            newErrors.quantity = 'Quantity must be greater than 0';
        }

        // For sell orders, check if user has enough balance
        if (formData.type === 'sell' && formData.quantity) {
            const requestedQuantity = parseFloat(formData.quantity) || 0;
            const available = getAvailableBalance(formData.symbol);

            if (requestedQuantity > available) {
                const baseAsset = selectedSymbol?.value.split('-')[0] || '';
                newErrors.quantity = `Insufficient balance. Available: ${available.toFixed(8)} ${baseAsset}`;
            }
        }


        // Validate price for limit orders
        if (formData.orderType === 'limit') {
            if (!formData.price) {
                newErrors.price = 'Price is required for limit orders';
            } else if (!/^\d+(\.\d{1,8})?$/.test(formData.price)) {
                newErrors.price = 'Price must be a positive decimal with up to 8 decimal places';
            } else if (parseFloat(formData.price) <= 0) {
                newErrors.price = 'Price must be greater than 0';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateTotal = () => {
        const quantity = parseFloat(formData.quantity) || 0;
        const price = formData.orderType === 'market'
            ? currentPrice
            : parseFloat(formData.price) || 0;

        return quantity * price;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Check if user is authenticated
        if (!user) {
            setErrors({ submit: 'Please log in to place orders' });
            return;
        }

        // Check if auth token exists
        const token = localStorage.getItem('authToken');
        if (!token) {
            setErrors({ submit: 'Authentication token not found. Please log in again.' });
            return;
        }

        setIsSubmitting(true);

        try {
            const orderPayload = {
                symbol: formData.symbol,
                side: formData.type.toUpperCase() as 'BUY' | 'SELL',
                type: formData.orderType.toUpperCase() as 'MARKET' | 'LIMIT',
                quantity: formData.quantity,
                price: formData.orderType === 'market' ? currentPrice.toString() : formData.price,
                timeInForce: formData.orderType === 'market' ? 'IOC' as const : 'GTC' as const,
            };

            const response = await ordersAPI.placeOrder({
                symbol: orderPayload.symbol,
                side: orderPayload.side,
                type: orderPayload.type,
                quantity: orderPayload.quantity,
                price: orderPayload.price,
                timeInForce: orderPayload.timeInForce,
            });

            console.log('Order placed successfully:', response.data);

            // Show success message based on order type
            const successMessage = formData.orderType === 'market'
                ? 'Market order executed successfully! Check your orders for execution details.'
                : 'Limit order placed successfully! It will execute when the market reaches your target price.';

            // Store success message to show after redirect
            sessionStorage.setItem('orderSuccessMessage', successMessage);

            // Redirect to orders page after successful submission
            router.push('/orders');
        } catch (error: unknown) {
            console.error('Failed to place order:', error);

            // Handle different error types
            const axiosError = error as {
                response?: {
                    status?: number;
                    data?: {
                        message?: string;
                        error?: string;
                        details?: unknown;
                    }
                }
            };

            if (axiosError.response?.status === 400) {
                // Validation error - try to extract specific field errors
                const errorData = axiosError.response.data;
                console.log('Validation error details:', errorData);

                if (errorData?.message) {
                    setErrors({ submit: `Validation error: ${errorData.message}` });
                } else if (errorData?.error) {
                    setErrors({ submit: `Bad request: ${errorData.error}` });
                } else {
                    setErrors({ submit: 'Invalid order data. Please check your inputs.' });
                }
            } else if (axiosError.response?.status === 401) {
                setErrors({ submit: 'Authentication failed. Please log in again.' });
                localStorage.removeItem('authToken');
            } else if (axiosError.response?.status === 403) {
                setErrors({ submit: 'You do not have permission to place orders.' });
            } else if (axiosError.response?.data?.message) {
                setErrors({ submit: axiosError.response.data.message });
            } else {
                setErrors({ submit: 'Failed to place order. Please try again.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        // For numeric fields, validate the input format as the user types
        if (field === 'quantity' || field === 'price') {
            // Allow empty string or valid decimal pattern (up to 8 decimal places)
            if (value !== '' && !/^\d*\.?\d{0,8}$/.test(value)) {
                return; // Don't update if invalid format
            }
        }

        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-600">Loading...</div>
                </div>
            </div>
        );
    }

    // Don't render if user is not authenticated (will redirect)
    if (!user) {
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        {formData.type === 'buy' ? (
                            <TrendingUp className="h-8 w-8 text-green-600 mr-2" />
                        ) : (
                            <TrendingDown className="h-8 w-8 text-red-600 mr-2" />
                        )}
                        {formData.type === 'buy' ? 'Buy' : 'Sell'} Order
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Place a new {formData.type} order
                    </p>
                </div>
            </div>

            {/* Order Form */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Order Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Order Side
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                            <button
                                type="button"
                                onClick={() => handleInputChange('type', 'buy')}
                                className={`flex-1 py-3 px-4 text-sm font-medium ${formData.type === 'buy'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <TrendingUp className="h-4 w-4 inline mr-2" />
                                Buy
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInputChange('type', 'sell')}
                                className={`flex-1 py-3 px-4 text-sm font-medium ${formData.type === 'sell'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <TrendingDown className="h-4 w-4 inline mr-2" />
                                Sell
                            </button>
                        </div>
                    </div>

                    {/* Symbol Selection */}
                    <div>
                        <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                            Trading Pair
                        </label>
                        <select
                            id="symbol"
                            value={formData.symbol}
                            onChange={(e) => handleInputChange('symbol', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {symbols.map(symbol => (
                                <option key={symbol.value} value={symbol.value}>
                                    {symbol.label}
                                </option>
                            ))}
                        </select>
                        {selectedSymbol && (
                            <p className="mt-1 text-sm text-gray-500">
                                Current price: ${selectedSymbol.price.toLocaleString()}
                            </p>
                        )}
                    </div>

                    {/* Order Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Order Type
                        </label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="market"
                                    checked={formData.orderType === 'market'}
                                    onChange={(e) => handleInputChange('orderType', e.target.value)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">Market</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="limit"
                                    checked={formData.orderType === 'limit'}
                                    onChange={(e) => handleInputChange('orderType', e.target.value)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">Limit</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quantity */}
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                                {formData.type === 'sell' && selectedSymbol && (
                                    <span className="ml-2 text-sm text-gray-500">
                                        (Available: {loadingBalances ? 'Loading...' : `${availableBalance.toFixed(8)} ${selectedSymbol.value.split('-')[0]}`})
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                id="quantity"
                                step="0.00000001"
                                placeholder="0.00000000"
                                value={formData.quantity}
                                onChange={(e) => handleInputChange('quantity', e.target.value)}
                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.quantity ? 'border-red-300' : 'border-gray-300'
                                    }`}
                            />
                            {errors.quantity && (
                                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                            )}
                            {formData.type === 'sell' && selectedSymbol && !loadingBalances && (
                                <div className="mt-2 flex justify-between text-xs text-gray-500">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('quantity', (availableBalance * 0.25).toFixed(8))}
                                        className="hover:text-indigo-600"
                                    >
                                        25%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('quantity', (availableBalance * 0.5).toFixed(8))}
                                        className="hover:text-indigo-600"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('quantity', (availableBalance * 0.75).toFixed(8))}
                                        className="hover:text-indigo-600"
                                    >
                                        75%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('quantity', availableBalance.toFixed(8))}
                                        className="hover:text-indigo-600"
                                    >
                                        Max
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Price (only for limit orders) */}
                        {formData.orderType === 'limit' && (
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                                    Price (USD)
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => handleInputChange('price', e.target.value)}
                                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.price ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                />
                                {errors.price && (
                                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Side:</span>
                                <span className={`font-medium ${formData.type === 'buy' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formData.type.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Symbol:</span>
                                <span className="font-medium">{formData.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-medium">{formData.quantity || '0.00000000'}</span>
                            </div>
                            {formData.type === 'sell' && selectedSymbol && !loadingBalances && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Available:</span>
                                    <span className="font-medium text-blue-600">
                                        {availableBalance.toFixed(8)} {selectedSymbol.value.split('-')[0]}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Price:</span>
                                <span className="font-medium">
                                    {formData.orderType === 'market'
                                        ? `$${currentPrice.toLocaleString()} (Market)`
                                        : `$${formData.price || '0.00'}`
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-gray-900 font-medium">Total:</span>
                                <span className="font-bold text-gray-900">
                                    ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {formData.orderType === 'market' && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-xs text-yellow-800">
                                        <strong>Market Order:</strong> Will execute immediately at the best available price.
                                        Actual execution price may differ from estimated price shown above.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${formData.type === 'buy'
                                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                } disabled:opacity-50`}
                        >
                            {isSubmitting ? 'Placing Order...' : `Place ${formData.type.toUpperCase()} Order`}
                        </button>
                    </div>

                    {/* Error Display */}
                    {errors.submit && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-700">
                                {errors.submit}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
