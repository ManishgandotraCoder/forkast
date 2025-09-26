'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import Double from '@/components/ui/Button';
import { BackendOrder, Order } from './interface';



export default function OrdersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Check for success message from order placement
    useEffect(() => {
        const message = sessionStorage.getItem('orderSuccessMessage');
        if (message) {
            setSuccessMessage(message);
            sessionStorage.removeItem('orderSuccessMessage');
            // Auto-hide after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    // Fetch orders from API
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const response = await ordersAPI.getOrders({
                    page: currentPage,
                    limit: itemsPerPage
                });
                console.log(response);

                // Check if response has pagination data
                if (response.data && typeof response.data === 'object' && 'orders' in response.data) {
                    // New paginated response format
                    const { orders: backendOrders, pagination } = response.data as {
                        orders: BackendOrder[];
                        pagination: {
                            page: number;
                            limit: number;
                            total: number;
                            totalPages: number;
                        };
                    };

                    setTotalItems(pagination.total);
                    setTotalPages(pagination.totalPages);

                    // Transform API response to match our interface
                    const ordersData: Order[] = backendOrders.map((order: BackendOrder) => ({
                        orderId: order.id.toString(),
                        clientOrderId: order.id.toString(), // Assuming no clientOrderId in backend
                        symbol: order.symbol,
                        side: order.type.toUpperCase() as 'BUY' | 'SELL',
                        type: order.market ? 'MARKET' : 'LIMIT',
                        status: order.status.toUpperCase() as 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIAL',
                        price: order.price.toString(),
                        originalQuantity: order.quantity.toString(),
                        filledQuantity: order.filledQuantity.toString(),
                        remainingQuantity: (order.quantity - order.filledQuantity).toString(),
                        avgFillPrice: undefined, // Not available in backend
                        createdAt: order.createdAt,
                        updatedAt: order.updatedAt,
                    }));
                    setOrders(ordersData);
                    setFilteredOrders(ordersData);
                } else {
                    // Fallback to old format (array of orders)
                    const ordersData: Order[] = (response.data as BackendOrder[]).map((order: BackendOrder) => ({
                        orderId: order.id.toString(),
                        clientOrderId: order.id.toString(), // Assuming no clientOrderId in backend
                        symbol: order.symbol,
                        side: order.type.toUpperCase() as 'BUY' | 'SELL',
                        type: order.market ? 'MARKET' : 'LIMIT',
                        status: order.status.toUpperCase() as 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIAL',
                        price: order.price.toString(),
                        originalQuantity: order.quantity.toString(),
                        filledQuantity: order.filledQuantity.toString(),
                        remainingQuantity: (order.quantity - order.filledQuantity).toString(),
                        avgFillPrice: undefined, // Not available in backend
                        createdAt: order.createdAt,
                        updatedAt: order.updatedAt,
                    }));
                    setOrders(ordersData);
                    setFilteredOrders(ordersData);
                    setTotalItems(ordersData.length);
                    setTotalPages(1);
                }
            } catch (err) {
                setError('Error fetching orders');
                console.error('Error fetching orders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        let filtered = orders;

        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status.toLowerCase() === statusFilter.toLowerCase());
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(order => order.side.toLowerCase() === typeFilter.toLowerCase());
        }

        setFilteredOrders(filtered);
    }, [orders, searchTerm, statusFilter, typeFilter]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (limit: number) => {
        setItemsPerPage(limit);
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            OPEN: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
            FILLED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle },
            PARTIAL: { color: 'bg-blue-100 text-blue-800', icon: Clock },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config?.icon || Clock;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                <Icon className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
            </span>
        );
    };

    const formatPrice = (price?: string) => {
        return price ? `$${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Market';
    };

    const formatQuantity = (quantity: string) => {
        return parseFloat(quantity).toFixed(8);
    };

    const columns = [
        {
            key: 'symbol',
            label: 'Symbol',
            render: (value: string) => (
                <div className="text-sm font-medium text-gray-900">{value}</div>
            ),
        },
        {
            key: 'side',
            label: 'Side',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'BUY'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {value}
                </span>
            ),
        },
        {
            key: 'originalQuantity',
            label: 'Quantity',
            render: (value: string, order: Order) => (
                <div className="text-sm text-gray-900">
                    <div>{formatQuantity(value)}</div>
                    {parseFloat(order.filledQuantity) > 0 && (
                        <div className="text-xs text-gray-500">
                            Filled: {formatQuantity(order.filledQuantity)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'price',
            label: 'Price',
            render: (value: string) => (
                <div className="text-sm text-gray-900">
                    {formatPrice(value)}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => getStatusBadge(value),
        },
        {
            key: 'createdAt',
            label: 'Created',
            render: (value: string) => (
                <div className="text-sm text-gray-500">
                    {new Date(value).toLocaleDateString()}
                    <div className="text-xs">
                        {new Date(value).toLocaleTimeString()}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right' as const,
            render: (_: string, order: Order) => (
                <div className="flex justify-end space-x-2">

                    {order.status === 'OPEN' && (
                        <Double
                            onClick={() => handleCancelOrder(order.orderId)}
                            size="md"
                            variant="danger"
                            title="Cancel Order"
                        />
                    )}
                </div>
            ),
        },
    ];


    const handleCancelOrder = async (orderId: string) => {
        try {
            await ordersAPI.cancelOrder(orderId);
            setOrders(orders.map(order =>
                order.orderId === orderId ? { ...order, status: 'CANCELLED' as const } : order
            ));
        } catch (err) {
            console.error('Error cancelling order:', err);
            alert('Failed to cancel order');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                                {successMessage}
                            </p>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSuccessMessage(null)}
                                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your trading orders. Market orders execute immediately at current price.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-600">Auto-refresh</span>
                    </label>
                    <button
                        onClick={() => router.push('/orders/new?type=buy')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Buy Order
                    </button>
                    <button
                        onClick={() => router.push('/orders/new?type=sell')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Sell Order
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                id="search"
                                placeholder="Search by symbol or order ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="filled">Filled</option>
                            <option value="partial">Partial</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Side
                        </label>
                        <select
                            id="type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="all">All Sides</option>
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <DataTable
                title={`Your Orders (${filteredOrders.length})`}
                columns={columns}
                data={filteredOrders}
                loading={loading}
                error={error}
                emptyMessage="No orders found matching your criteria."
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        showItemsPerPage={true}
                    />
                </div>
            )}
        </div>
    );
}
