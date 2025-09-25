'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, X } from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { OrderDetails, OrderResponse } from '../interface';

export default function OrderDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                setLoading(true);
                const response = await ordersAPI.getOrder(orderId);
                const data: OrderResponse = response.data;
                console.log("data", data);

                if (data.success) {
                    setOrder(data.data);
                } else {
                    setError('Failed to fetch order details');
                }
            } catch (err) {
                setError('Error fetching order details');
                console.error('Failed to fetch order details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId]);

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            OPEN: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Open' },
            FILLED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Filled' },
            CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
            PARTIAL: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Partially Filled' },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config?.icon || Clock;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                <Icon className="w-4 h-4 mr-2" />
                {config?.label || status}
            </span>
        );
    };

    const formatPrice = (price?: string) => {
        return price ? `$${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Market';
    };

    const formatQuantity = (quantity: string) => {
        return parseFloat(quantity).toFixed(8);
    };

    const getProgressPercentage = () => {
        if (!order || !order.filledQuantity) return 0;
        return (parseFloat(order.filledQuantity) / parseFloat(order.originalQuantity)) * 100;
    };

    const handleCancelOrder = async () => {
        if (!order || (order.status !== 'OPEN' && order.status !== 'PARTIAL')) return;

        setCancelling(true);
        try {
            await ordersAPI.cancelOrder(order.orderId);
            setOrder({ ...order, status: 'CANCELLED' });
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">{error || 'Order not found'}</p>
                <button
                    onClick={() => router.push('/orders')}
                    className="mt-4 text-indigo-600 hover:text-indigo-500"
                >
                    Back to Orders
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/orders')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                            {order.side === 'BUY' ? (
                                <TrendingUp className="h-8 w-8 text-green-600 mr-2" />
                            ) : (
                                <TrendingDown className="h-8 w-8 text-red-600 mr-2" />
                            )}
                            Order Details
                        </h1>
                        <p className="mt-2 text-gray-600">Order ID: {order.orderId}</p>
                    </div>
                </div>

                {(order.status === 'OPEN' || order.status === 'PARTIAL') && (
                    <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                        <X className="h-4 w-4 mr-2" />
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
                        {getStatusBadge(order.status)}
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Trading Pair</h4>
                            <p className="text-lg font-semibold text-gray-900">{order.symbol}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Side & Type</h4>
                            <div className="space-y-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${order.side === 'BUY'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {order.side}
                                </span>
                                <p className="text-sm text-gray-600">{order.type} order</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Quantity</h4>
                            <p className="text-lg font-semibold text-gray-900">{formatQuantity(order.originalQuantity)}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Price</h4>
                            <p className="text-lg font-semibold text-gray-900">{formatPrice(order.price)}</p>
                        </div>
                    </div>

                    {/* Progress Bar for Partial Orders */}
                    {(order.status === 'PARTIAL' || parseFloat(order.filledQuantity) > 0) && (
                        <div className="mt-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Fill Progress</span>
                                <span>{getProgressPercentage().toFixed(1)}% completed</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${getProgressPercentage()}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Filled: {formatQuantity(order.filledQuantity)}</span>
                                <span>Remaining: {formatQuantity(order.remainingQuantity)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Execution Details */}
            {(parseFloat(order.filledQuantity) > 0 || order.avgFillPrice) && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Execution Details</h3>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {parseFloat(order.filledQuantity) > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Filled Quantity</h4>
                                    <p className="text-lg font-semibold text-gray-900">{formatQuantity(order.filledQuantity)}</p>
                                </div>
                            )}

                            {order.avgFillPrice && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Average Fill Price</h4>
                                    <p className="text-lg font-semibold text-gray-900">{formatPrice(order.avgFillPrice)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Timestamps</h3>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Created At</h4>
                            <p className="text-sm text-gray-900">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h4>
                            <p className="text-sm text-gray-900">{new Date(order.updatedAt).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
