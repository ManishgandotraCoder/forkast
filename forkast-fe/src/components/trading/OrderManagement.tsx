'use client';

import { useState, useEffect } from 'react';
import { ordersAPI } from '@/lib/api';
import { RefreshCw, X, Eye, Trash2 } from 'lucide-react';

interface Order {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    status: string;
    filledQuantity: number;
    remainingQuantity: number;
    timestamp: string;
    clientOrderId?: string;
}

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [cancelingOrder, setCancelingOrder] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        symbol: '',
        side: '' as '' | 'BUY' | 'SELL',
        status: '',
    });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {
                    ...(filters.symbol && { symbol: filters.symbol }),
                    ...(filters.side && { side: filters.side }),
                    ...(filters.status && { status: filters.status }),
                    limit: 100,
                };

                const response = await ordersAPI.getOrders(params);
                setOrders(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = {
                ...(filters.symbol && { symbol: filters.symbol }),
                ...(filters.side && { side: filters.side }),
                ...(filters.status && { status: filters.status }),
                limit: 100,
            };

            const response = await ordersAPI.getOrders(params);
            setOrders(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (orderId: string) => {
        setCancelingOrder(orderId);
        try {
            await ordersAPI.cancelOrder(orderId, 'User requested cancellation');
            await fetchOrders(); // Refresh the list
        } catch (error) {
            console.error('Failed to cancel order:', error);
        } finally {
            setCancelingOrder(null);
        }
    };

    const viewOrderDetails = async (orderId: string) => {
        try {
            const response = await ordersAPI.getOrder(orderId);
            setSelectedOrder(response.data.data);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
        }
    };

    const formatPrice = (price: number) => `$${price?.toFixed(2)}`;
    const formatQuantity = (quantity: number) => quantity.toFixed(8);
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'filled':
                return 'bg-green-100 text-green-800';
            case 'partially_filled':
                return 'bg-yellow-100 text-yellow-800';
            case 'open':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const canCancelOrder = (status: string) => {
        return ['open', 'partially_filled'].includes(status.toLowerCase());
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Management</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label htmlFor="symbol-filter" className="block text-sm font-medium text-gray-700">
                            Symbol
                        </label>
                        <select
                            id="symbol-filter"
                            value={filters.symbol}
                            onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="">All Symbols</option>
                            <option value="BTC-USD">BTC-USD</option>
                            <option value="ETH-USD">ETH-USD</option>
                            <option value="SOL-USD">SOL-USD</option>
                            <option value="ADA-USD">ADA-USD</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="side-filter" className="block text-sm font-medium text-gray-700">
                            Side
                        </label>
                        <select
                            id="side-filter"
                            value={filters.side}
                            onChange={(e) => setFilters({ ...filters, side: e.target.value as '' | 'BUY' | 'SELL' })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="">All Sides</option>
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            id="status-filter"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="PARTIALLY_FILLED">Partially Filled</option>
                            <option value="FILLED">Filled</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={fetchOrders}
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
                    </div>
                ) : orders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Order ID
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Filled
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                            {order.orderId.substring(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {order.symbol}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.side === 'BUY'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {order.side}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatQuantity(order.quantity)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatPrice(order.price)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {formatQuantity(order.filledQuantity)} / {formatQuantity(order.quantity)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {formatTime(order.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => viewOrderDetails(order.orderId)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {canCancelOrder(order.status) && (
                                                    <button
                                                        onClick={() => cancelOrder(order.orderId)}
                                                        disabled={cancelingOrder === order.orderId}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        {cancelingOrder === order.orderId ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No orders found</p>
                        <button
                            onClick={fetchOrders}
                            className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm"
                        >
                            Refresh orders
                        </button>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Order ID:</span>
                                <span className="font-mono">{selectedOrder.orderId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Symbol:</span>
                                <span className="font-medium">{selectedOrder.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Side:</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedOrder.side === 'BUY'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {selectedOrder.side}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Quantity:</span>
                                <span className="font-mono">{formatQuantity(selectedOrder.quantity)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Price:</span>
                                <span className="font-mono">{formatPrice(selectedOrder.price)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status:</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Filled:</span>
                                <span className="font-mono">{formatQuantity(selectedOrder.filledQuantity)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Remaining:</span>
                                <span className="font-mono">{formatQuantity(selectedOrder.remainingQuantity)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Time:</span>
                                <span className="font-mono">{formatTime(selectedOrder.timestamp)}</span>
                            </div>
                            {selectedOrder.clientOrderId && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Client Order ID:</span>
                                    <span className="font-mono">{selectedOrder.clientOrderId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
