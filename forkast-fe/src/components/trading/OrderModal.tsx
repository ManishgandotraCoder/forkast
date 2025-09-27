'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import ButtonComponent from '@/components/ui/Button';

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderType: 'buy' | 'sell';
    symbol: string;
    suggestedPrice?: number;
    onOrderPlaced?: () => void;
}

interface OrderFormData {
    price: string;
    quantity: string;
    market: boolean;
}

export default function OrderModal({
    isOpen,
    onClose,
    orderType,
    symbol,
    suggestedPrice = 0,
    onOrderPlaced
}: OrderModalProps) {
    const [formData, setFormData] = useState<OrderFormData>({
        price: suggestedPrice.toString(),
        quantity: '',
        market: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    // Calculate total when price or quantity changes
    useEffect(() => {
        const price = parseFloat(formData.price) || 0;
        const quantity = parseFloat(formData.quantity) || 0;
        setTotal(price * quantity);
    }, [formData.price, formData.quantity]);

    // Update price when suggested price changes
    useEffect(() => {
        if (suggestedPrice > 0 && !formData.market) {
            setFormData(prev => ({
                ...prev,
                price: suggestedPrice.toString()
            }));
        }
    }, [suggestedPrice, formData.market]);

    const handleInputChange = (field: keyof OrderFormData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const price = parseFloat(formData.price);
            const quantity = parseFloat(formData.quantity);

            // Validation
            if (!formData.market && (!price || price <= 0)) {
                throw new Error('Please enter a valid price');
            }
            if (!quantity || quantity <= 0) {
                throw new Error('Please enter a valid quantity');
            }

            // Place the order
            await ordersAPI.placeOrder({
                symbol,
                side: orderType.toUpperCase() as 'BUY' | 'SELL',
                type: formData.market ? 'MARKET' : 'LIMIT',
                quantity: quantity.toString(),
                price: formData.market ? undefined : price.toString(),
                timeInForce: 'GTC'
            });

            // Success - close modal and refresh data
            onOrderPlaced?.();
            onClose();

            // Reset form
            setFormData({
                price: suggestedPrice.toString(),
                quantity: '',
                market: false
            });

        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            price: suggestedPrice.toString(),
            quantity: '',
            market: false
        });
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className={`px-6 py-4 rounded-t-xl ${orderType === 'buy'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {orderType === 'buy' ? (
                                <TrendingUp className="h-6 w-6 text-white" />
                            ) : (
                                <TrendingDown className="h-6 w-6 text-white" />
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-white capitalize">
                                    {orderType} {symbol}
                                </h2>
                                <p className="text-green-100 text-sm">
                                    {orderType === 'buy' ? 'Purchase cryptocurrency' : 'Sell your cryptocurrency'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Market/Limit Toggle */}
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleInputChange('market', false)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${!formData.market
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                }`}
                        >
                            Limit Order
                        </button>
                        <button
                            type="button"
                            onClick={() => handleInputChange('market', true)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${formData.market
                                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                }`}
                        >
                            Market Order
                        </button>
                    </div>

                    {/* Price Input */}
                    {!formData.market && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <DollarSign className="inline h-4 w-4 mr-1" />
                                Price (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => handleInputChange('price', e.target.value)}
                                placeholder="Enter price"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                    )}

                    {/* Quantity Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Package className="inline h-4 w-4 mr-1" />
                            Quantity
                        </label>
                        <input
                            type="number"
                            step="0.00000001"
                            value={formData.quantity}
                            onChange={(e) => handleInputChange('quantity', e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Total Display */}
                    {total > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-lg font-bold text-gray-900">
                                    ${total.toFixed(2)} USD
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.quantity}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${orderType === 'buy'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Placing...
                                </div>
                            ) : (
                                `Place ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
