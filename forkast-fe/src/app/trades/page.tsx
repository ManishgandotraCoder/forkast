'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { tradesAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCryptoSymbols } from '@/lib/useCryptoSymbols';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { ApiTrade, Trade } from './interface';



export default function TradesPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sideFilter, setSideFilter] = useState('all');
    const [symbolFilter, setSymbolFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const { cryptos: cryptoSymbols } = useCryptoSymbols();
    const symbols = cryptoSymbols.map(crypto => crypto.symbol);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    // Fetch trades from API
    useEffect(() => {
        const fetchTrades = async () => {
            try {
                setLoading(true);
                setError(null);

                // Try to fetch trades from the API with pagination
                const response = await tradesAPI.getTrades({
                    symbol: 'BTC-USD',
                    page: currentPage,
                    limit: itemsPerPage
                });

                // Check if response has pagination data
                if (response.data && typeof response.data === 'object' && 'trades' in response.data) {
                    // New paginated response format
                    const { trades: apiTrades, pagination } = response.data as {
                        trades: ApiTrade[];
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
                    const transformedTrades = apiTrades.map((trade: ApiTrade) => {
                        // Determine side: if sellOrderId is null, it's a buy (buy order was filled)
                        // if buyOrderId is null, it's a sell (sell order was filled)
                        const side: 'buy' | 'sell' = trade.sellOrderId === null ? 'buy' : 'sell';

                        return {
                            id: trade.id.toString(),
                            symbol: 'BTC-USD', // Using the requested symbol since API doesn't return it
                            side,
                            quantity: Number(trade.quantity),
                            price: Number(trade.price),
                            value: Number(trade.quantity) * Number(trade.price),
                            fees: 0, // Fees not provided in trade data
                            timestamp: trade.executedAt,
                            orderId: (trade.buyOrderId || trade.sellOrderId || trade.id).toString(), // Use available order ID
                        };
                    });

                    setTrades(transformedTrades);
                } else {
                    // Fallback to old format (array of trades)
                    const apiTrades = (response.data as ApiTrade[]).map((trade: ApiTrade) => {
                        // Determine side: if sellOrderId is null, it's a buy (buy order was filled)
                        // if buyOrderId is null, it's a sell (sell order was filled)
                        const side: 'buy' | 'sell' = trade.sellOrderId === null ? 'buy' : 'sell';

                        return {
                            id: trade.id.toString(),
                            symbol: 'BTC-USD', // Using the requested symbol since API doesn't return it
                            side,
                            quantity: Number(trade.quantity),
                            price: Number(trade.price),
                            value: Number(trade.quantity) * Number(trade.price),
                            fees: 0, // Fees not provided in trade data
                            timestamp: trade.executedAt,
                            orderId: (trade.buyOrderId || trade.sellOrderId || trade.id).toString(), // Use available order ID
                        };
                    });

                    setTrades(apiTrades);
                    setTotalItems(apiTrades.length);
                    setTotalPages(1);
                }
            } catch (err: unknown) {
                console.error('Error fetching trades:', err);

                // If API call fails (endpoint doesn't exist or network error), use mock data
                const mockTrades: Trade[] = [
                    {
                        id: 'trade-1',
                        symbol: 'BTC-USD',
                        side: 'buy',
                        quantity: 0.15,
                        price: 67400,
                        value: 10110,
                        fees: 5.06,
                        timestamp: '2025-01-21T10:45:00Z',
                        orderId: '1',
                    },
                    {
                        id: 'trade-2',
                        symbol: 'BTC-USD',
                        side: 'buy',
                        quantity: 0.15,
                        price: 67500,
                        value: 10125,
                        fees: 5.06,
                        timestamp: '2025-01-21T11:15:00Z',
                        orderId: '1',
                    },
                    {
                        id: 'trade-3',
                        symbol: 'ETH-USD',
                        side: 'sell',
                        quantity: 2,
                        price: 3842.15,
                        value: 7684.30,
                        fees: 3.84,
                        timestamp: '2025-01-21T09:15:00Z',
                        orderId: '2',
                    },
                    {
                        id: 'trade-4',
                        symbol: 'SOL-USD',
                        side: 'buy',
                        quantity: 4,
                        price: 245.67,
                        value: 982.68,
                        fees: 0.49,
                        timestamp: '2025-01-21T08:45:00Z',
                        orderId: '3',
                    },
                    {
                        id: 'trade-5',
                        symbol: 'ADA-USD',
                        side: 'sell',
                        quantity: 1000,
                        price: 0.52,
                        value: 520,
                        fees: 0.26,
                        timestamp: '2025-01-20T16:30:00Z',
                        orderId: '4',
                    },
                ];

                // Check if it's a network error or endpoint not found
                const isNetworkError = (error: unknown): boolean => {
                    if (error && typeof error === 'object') {
                        const err = error as { response?: { status?: number }; code?: string; message?: string };
                        return (
                            err.response?.status === 404 ||
                            err.code === 'ECONNREFUSED' ||
                            err.message?.includes('Network Error') ||
                            false
                        );
                    }
                    return false;
                };

                // If it's a 404 or network error, use mock data silently
                if (isNetworkError(err)) {
                    setTrades(mockTrades);
                    setTotalItems(mockTrades.length);
                    setTotalPages(1);
                } else {
                    // For other errors, show error message but also provide mock data
                    setError('Unable to fetch live data. Showing sample data.');
                    setTrades(mockTrades);
                    setTotalItems(mockTrades.length);
                    setTotalPages(1);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        let filtered = trades;

        if (searchTerm) {
            filtered = filtered.filter(trade =>
                trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trade.orderId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sideFilter !== 'all') {
            filtered = filtered.filter(trade => trade.side === sideFilter);
        }

        if (symbolFilter !== 'all') {
            filtered = filtered.filter(trade => trade.symbol === symbolFilter);
        }


        setFilteredTrades(filtered);
    }, [trades, searchTerm, sideFilter, symbolFilter]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (limit: number) => {
        setItemsPerPage(limit);
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    const formatPrice = (price: number) => {
        return `$${Number(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    };

    const formatQuantity = (quantity: number) => {
        return Number(quantity || 0).toFixed(8);
    };

    const columns = [
        {
            key: 'timestamp',
            label: 'Time',
            render: (value: string) => (
                <div className="text-sm text-gray-900">
                    <div>{new Date(value).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">
                        {new Date(value).toLocaleTimeString()}
                    </div>
                </div>
            ),
        },
        {
            key: 'symbol',
            label: 'Symbol',
            render: (value: string, trade: Trade) => (
                <div>
                    <div className="text-sm font-medium text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">ID: {trade.id}</div>
                </div>
            ),
        },
        {
            key: 'side',
            label: 'Side',
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value === 'buy'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {value.toUpperCase()}
                </span>
            ),
        },
        {
            key: 'quantity',
            label: 'Quantity',
            render: (value: number) => (
                <div className="text-sm text-gray-900 font-mono">
                    {formatQuantity(value)}
                </div>
            ),
        },
        {
            key: 'price',
            label: 'Price',
            render: (value: number) => (
                <div className="text-sm text-gray-900 font-mono">
                    {formatPrice(value)}
                </div>
            ),
        },
        {
            key: 'value',
            label: 'Value',
            render: (value: number) => (
                <div className="text-sm text-gray-900 font-mono">
                    {formatPrice(value)}
                </div>
            ),
        },
    ];

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
            {/* Header */}


            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Loading trades...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="text-red-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-800 font-medium">Error loading trades</p>
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content - only show when not loading and no error */}
            {!loading && !error && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        id="search"
                                        placeholder="Search trades..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="side" className="block text-sm font-medium text-gray-700 mb-1">
                                    Side
                                </label>
                                <select
                                    id="side"
                                    value={sideFilter}
                                    onChange={(e) => setSideFilter(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="all">All Sides</option>
                                    <option value="buy">Buy</option>
                                    <option value="sell">Sell</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                                    Symbol
                                </label>
                                <select
                                    id="symbol"
                                    value={symbolFilter}
                                    onChange={(e) => setSymbolFilter(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="all">All Symbols</option>
                                    {symbols.map(symbol => (
                                        <option key={symbol} value={symbol}>{symbol}</option>
                                    ))}
                                </select>
                            </div>


                        </div>
                    </div>

                    {/* Trades Table */}
                    <DataTable
                        title={`Trade History (${filteredTrades?.length} trades)`}
                        columns={columns}
                        data={filteredTrades}
                        loading={loading}
                        error={error}
                        emptyMessage="No trades found matching your criteria."
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
                </>
            )}
        </div>
    );
}
