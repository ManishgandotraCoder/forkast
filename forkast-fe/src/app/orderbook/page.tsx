'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { orderbookAPI } from '@/lib/api';
import { useCryptoSymbols } from '@/lib/useCryptoSymbols';
import {
    TrendingUp,
    Users,
    RefreshCw,
    Filter,
    Search,
    ChevronUp,
    ChevronDown,
    BarChart3,
    Eye,
    EyeOff,
    Download
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface OrderBookEntry {
    price: number | string;
    quantity: number | string;
    total?: number | string;
    userName?: string;
}

interface OrderBookData {
    symbol: string;
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    timestamp: string;
}

interface Order {
    symbol: string;
    price: number;
    quantity: number;
    user: {
        name: string;
    };
}
export default function OrderBookPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [symbol, setSymbol] = useState('BTC-USD');
    const [orderFilter, setOrderFilter] = useState<'all' | 'buy' | 'sell'>('all');

    // Enhanced UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [refreshInterval] = useState(5000); // 5 seconds

    // Advanced features state
    const [showDepthChart, setShowDepthChart] = useState(true);
    const [showMarketStats, setShowMarketStats] = useState(true);
    const [compactView, setCompactView] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
    const [hoveredOrder, setHoveredOrder] = useState<number | null>(null);
    const [pricePrecision, setPricePrecision] = useState(2);
    const [volumePrecision, setVolumePrecision] = useState(8);
    const [showZeroVolume, setShowZeroVolume] = useState(false);
    const [groupByPrice, setGroupByPrice] = useState(false);
    const [groupSize, setGroupSize] = useState(1);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const { cryptos: cryptoSymbols } = useCryptoSymbols();

    // Enhanced utility functions
    const formatPrice = useCallback((price: number | string | null | undefined) => {
        if (price === null || price === undefined) return '0.00';
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (typeof numPrice !== 'number' || isNaN(numPrice)) return '0.00';
        return numPrice.toFixed(pricePrecision);
    }, [pricePrecision]);

    const formatQuantity = useCallback((quantity: number | string) => {
        const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        return isNaN(numQuantity) ? '0.00000000' : numQuantity.toFixed(volumePrecision);
    }, [volumePrecision]);

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatCurrency = useCallback((amount: number | string) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: pricePrecision,
            maximumFractionDigits: pricePrecision
        }).format(numAmount);
    }, [pricePrecision]);

    const formatVolume = (volume: number | string) => {
        const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
        if (isNaN(numVolume)) return '0';

        if (numVolume >= 1000000) {
            return (numVolume / 1000000).toFixed(1) + 'M';
        } else if (numVolume >= 1000) {
            return (numVolume / 1000).toFixed(1) + 'K';
        }
        return numVolume.toFixed(volumePrecision);
    };

    const calculateSpread = (bestBid: number, bestAsk: number) => {
        return bestAsk - bestBid;
    };

    const calculateSpreadPercentage = (bestBid: number, bestAsk: number) => {
        return ((bestAsk - bestBid) / bestBid) * 100;
    };

    // Group orders by price levels
    const groupOrdersByPrice = (orders: OrderBookEntry[], groupSize: number, direction: 'asc' | 'desc') => {
        const grouped = new Map<number, OrderBookEntry>();

        orders.forEach(order => {
            const price = typeof order.price === 'string' ? parseFloat(order.price) : order.price;
            const quantity = typeof order.quantity === 'string' ? parseFloat(order.quantity) : order.quantity;

            // Round price to nearest group size
            const groupedPrice = direction === 'asc'
                ? Math.floor(price / groupSize) * groupSize
                : Math.ceil(price / groupSize) * groupSize;

            if (grouped.has(groupedPrice)) {
                const existing = grouped.get(groupedPrice)!;
                const existingQty = typeof existing.quantity === 'string' ? parseFloat(existing.quantity) : existing.quantity;
                grouped.set(groupedPrice, {
                    ...existing,
                    quantity: existingQty + quantity,
                    total: (existingQty + quantity) * groupedPrice
                });
            } else {
                grouped.set(groupedPrice, {
                    ...order,
                    price: groupedPrice,
                    quantity: quantity,
                    total: quantity * groupedPrice
                });
            }
        });

        return Array.from(grouped.values()).sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return direction === 'asc' ? priceA - priceB : priceB - priceA;
        });
    };

    const fetchOrderBook = useCallback(async (symbol: string) => {
        setLoading(true);
        try {
            const response = await orderbookAPI.getOrderbook({
                symbol,
                page: currentPage,
                limit: itemsPerPage
            });

            // Check if response has pagination data
            if (response.data && typeof response.data === 'object' && 'buys' in response.data && 'sells' in response.data) {
                const { buys, sells, pagination } = response.data as {
                    buys: Order[];
                    sells: Order[];
                    pagination: {
                        page: number;
                        limit: number;
                        totalBuys: number;
                        totalSells: number;
                        totalPages: number;
                    };
                };

                setTotalItems(Math.max(pagination.totalBuys, pagination.totalSells));
                setTotalPages(pagination.totalPages);

                const bids = buys.map(b => ({ price: b.price, quantity: b.quantity, userName: b.user.name }));
                const asks = sells.map(s => ({ price: s.price, quantity: s.quantity, userName: s.user.name }));
                setOrderBook({ symbol, bids, asks, timestamp: new Date().toISOString() });
            } else {
                // Fallback to old format
                const { buys, sells }: { buys: Order[], sells: Order[] } = response.data;
                const bids = buys.map(b => ({ price: b.price, quantity: b.quantity, userName: b.user.name }));
                const asks = sells.map(s => ({ price: s.price, quantity: s.quantity, userName: s.user.name }));
                setOrderBook({ symbol, bids, asks, timestamp: new Date().toISOString() });
                setTotalItems(buys.length + sells.length);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Failed to fetch orderbook:', error);
            setOrderBook(null);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        if (symbol) {
            fetchOrderBook(symbol);
        }
    }, [symbol, currentPage, itemsPerPage, fetchOrderBook]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (limit: number) => {
        setItemsPerPage(limit);
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    // Enhanced data processing with market depth, grouping, and cumulative volumes
    const { processedBids, processedAsks, maxVolume, marketStats } = useMemo(() => {
        if (!orderBook) return {
            processedBids: [],
            processedAsks: [],
            maxVolume: 0,
            marketStats: {
                totalBidVolume: 0,
                totalAskVolume: 0,
                bestBid: 0,
                bestAsk: 0,
                spread: 0,
                spreadPercentage: 0
            }
        };

        let sortedBids = [...orderBook.bids].sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return priceB - priceA; // Highest price first
        });

        let sortedAsks = [...orderBook.asks].sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return priceA - priceB; // Lowest price first
        });

        // Group orders by price if enabled
        if (groupByPrice && groupSize > 1) {
            sortedBids = groupOrdersByPrice(sortedBids, groupSize, 'desc');
            sortedAsks = groupOrdersByPrice(sortedAsks, groupSize, 'asc');
        }

        // Filter out zero volume orders if disabled
        if (!showZeroVolume) {
            sortedBids = sortedBids.filter(bid => {
                const qty = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
                return qty > 0;
            });
            sortedAsks = sortedAsks.filter(ask => {
                const qty = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
                return qty > 0;
            });
        }

        // Calculate cumulative volumes
        let cumulativeBidVolume = 0;
        const processedBids = sortedBids.map(bid => {
            const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
            cumulativeBidVolume += quantity;
            return {
                ...bid,
                cumulativeVolume: cumulativeBidVolume,
                timestamp: 'timestamp' in bid ? (bid as OrderBookEntry & { timestamp?: string }).timestamp || new Date().toISOString() : new Date().toISOString()
            };
        });

        let cumulativeAskVolume = 0;
        const processedAsks = sortedAsks.map(ask => {
            const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
            cumulativeAskVolume += quantity;
            return {
                ...ask,
                cumulativeVolume: cumulativeAskVolume,
                timestamp: 'timestamp' in ask ? (ask as OrderBookEntry & { timestamp?: string }).timestamp || new Date().toISOString() : new Date().toISOString()
            };
        });

        const maxVolume = Math.max(cumulativeBidVolume, cumulativeAskVolume);

        // Calculate market statistics
        const bestBid = processedBids.length > 0 ?
            (typeof processedBids[0].price === 'string' ? parseFloat(processedBids[0].price) : processedBids[0].price) : 0;
        const bestAsk = processedAsks.length > 0 ?
            (typeof processedAsks[0].price === 'string' ? parseFloat(processedAsks[0].price) : processedAsks[0].price) : 0;

        const marketStats = {
            totalBidVolume: cumulativeBidVolume,
            totalAskVolume: cumulativeAskVolume,
            bestBid,
            bestAsk,
            spread: bestBid > 0 && bestAsk > 0 ? calculateSpread(bestBid, bestAsk) : 0,
            spreadPercentage: bestBid > 0 && bestAsk > 0 ? calculateSpreadPercentage(bestBid, bestAsk) : 0
        };

        return { processedBids, processedAsks, maxVolume, marketStats };
    }, [orderBook, groupByPrice, groupSize, showZeroVolume]);

    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
        let filteredBids = processedBids;
        let filteredAsks = processedAsks;

        // Apply order type filter
        if (orderFilter === 'buy') {
            filteredAsks = [];
        } else if (orderFilter === 'sell') {
            filteredBids = [];
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredBids = filteredBids.filter(bid =>
                bid.userName?.toLowerCase().includes(term) ||
                formatPrice(bid.price).includes(term) ||
                formatQuantity(bid.quantity).includes(term)
            );
            filteredAsks = filteredAsks.filter(ask =>
                ask.userName?.toLowerCase().includes(term) ||
                formatPrice(ask.price).includes(term) ||
                formatQuantity(ask.quantity).includes(term)
            );
        }

        // Apply sorting
        if (sortConfig) {
            const { key, direction } = sortConfig;
            const multiplier = direction === 'asc' ? 1 : -1;

            const sortFunction = (a: OrderBookEntry, b: OrderBookEntry) => {
                let aVal, bVal;
                switch (key) {
                    case 'price':
                        aVal = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
                        bVal = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
                        break;
                    case 'quantity':
                        aVal = typeof a.quantity === 'string' ? parseFloat(a.quantity) : a.quantity;
                        bVal = typeof b.quantity === 'string' ? parseFloat(b.quantity) : b.quantity;
                        break;
                    case 'user':
                        aVal = a.userName || '';
                        bVal = b.userName || '';
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return -1 * multiplier;
                if (aVal > bVal) return 1 * multiplier;
                return 0;
            };

            filteredBids.sort(sortFunction);
            filteredAsks.sort(sortFunction);
        }

        return { filteredBids, filteredAsks };
    }, [processedBids, processedAsks, orderFilter, searchTerm, sortConfig, formatPrice, formatQuantity]);

    // Enhanced event handlers
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const handleRefresh = useCallback(async () => {
        if (symbol) {
            setIsRefreshing(true);
            try {
                await fetchOrderBook(symbol);
            } finally {
                setIsRefreshing(false);
            }
        }
    }, [symbol, fetchOrderBook]);

    const handlePriceClick = useCallback((price: number, side: 'buy' | 'sell') => {
        setSelectedPrice(price);
        console.log(`Clicked ${side} price: ${price}`);
        // In a real app, this would trigger order placement or price selection
        // For now, we'll just show a notification
        const message = `Selected ${side} price: ${formatCurrency(price)}. This price can be used for trading.`;
        // You could replace this with a toast notification or modal
        console.log(message);
    }, [formatCurrency]);

    const handleOrderHover = useCallback((index: number | null) => {
        setHoveredOrder(index);
    }, []);

    const handleQuickTrade = useCallback((price: number, side: 'buy' | 'sell', quantity: number) => {
        // Quick trade functionality - in a real app this would place an order
        console.log(`Quick ${side} trade: ${quantity} at ${formatCurrency(price)}`);
        // This could trigger a modal or API call
    }, [formatCurrency]);

    const handleExportData = useCallback(() => {
        if (!orderBook) return;

        const data = {
            symbol: orderBook.symbol,
            timestamp: orderBook.timestamp,
            bids: filteredAndSortedData.filteredBids,
            asks: filteredAndSortedData.filteredAsks,
            marketStats
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orderbook-${orderBook.symbol}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [orderBook, filteredAndSortedData, marketStats]);

    // Keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent, price: number, side: 'buy' | 'sell', index: number) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePriceClick(price, side);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedRow(index + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedRow(Math.max(0, index - 1));
        }
    }, [handlePriceClick]);

    // Auto-refresh functionality
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (symbol) {
            interval = setInterval(() => {
                fetchOrderBook(symbol);
            }, refreshInterval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [symbol, refreshInterval, fetchOrderBook]);
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
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
            {/* Enhanced Controls */}


            {loading ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-3 text-sm text-gray-500">Loading orderbook...</p>
                    </div>
                </div>
            ) : orderBook ? (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                    {/* Enhanced Header with Market Stats */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <BarChart3 className="h-6 w-6" />
                                    <h2 className="text-2xl font-bold">Order Book</h2>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full">
                                        {orderBook.symbol}
                                    </span>
                                    <span className="text-sm opacity-90">
                                        {formatTimestamp(orderBook.timestamp)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={handleExportData}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                                    title="Export Data"
                                >
                                    <Download className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Market Statistics */}


                    {/* Advanced Controls */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search orders by user, price, or quantity..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Symbol Selection */}
                            <select
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {cryptoSymbols.map((crypto) => (
                                    <option key={crypto.symbol} value={crypto.symbol}>
                                        {crypto.symbol}
                                    </option>
                                ))}
                            </select>

                            {/* Order Type Filter */}
                            <select
                                value={orderFilter}
                                onChange={(e) => setOrderFilter(e.target.value as 'all' | 'buy' | 'sell')}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Orders</option>
                                <option value="buy">Buy Orders</option>
                                <option value="sell">Sell Orders</option>
                            </select>

                            {/* Items Per Page */}
                            <select
                                value={itemsPerPage}
                                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value={5}>5 rows</option>
                                <option value={10}>10 rows</option>
                                <option value={25}>25 rows</option>
                                <option value={50}>50 rows</option>
                            </select>


                        </div>

                    </div>

                    {/* Market Summary */}
                    {filteredAndSortedData.filteredBids.length > 0 || filteredAndSortedData.filteredAsks.length > 0 ? (
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {filteredAndSortedData.filteredBids.length > 0 ? formatPrice(filteredAndSortedData.filteredBids[0].price) : 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-600">Best Bid</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-800">

                                    </div>
                                    <div className="text-sm text-gray-600"></div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {filteredAndSortedData.filteredAsks.length > 0 ? formatPrice(filteredAndSortedData.filteredAsks[0].price) : 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-600">Best Ask</div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Order Book Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('user')}
                                    >
                                        <div className="flex items-center">
                                            <Users className="h-4 w-4 mr-1" />
                                            <span className="hidden sm:inline">User</span>
                                            <span className="sm:hidden">U</span>
                                            {sortConfig?.key === 'user' && (
                                                sortConfig.direction === 'asc' ?
                                                    <ChevronUp className="h-4 w-4 ml-1" /> :
                                                    <ChevronDown className="h-4 w-4 ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center justify-end">
                                            <span className="hidden sm:inline">Quantity</span>
                                            <span className="sm:hidden">Qty</span>
                                            {sortConfig?.key === 'quantity' && (
                                                sortConfig.direction === 'asc' ?
                                                    <ChevronUp className="h-4 w-4 ml-1" /> :
                                                    <ChevronDown className="h-4 w-4 ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('price')}
                                    >
                                        <div className="flex items-center justify-end">
                                            <span className="hidden sm:inline">Price (USD)</span>
                                            <span className="sm:hidden">Price</span>
                                            {sortConfig?.key === 'price' && (
                                                sortConfig.direction === 'asc' ?
                                                    <ChevronUp className="h-4 w-4 ml-1" /> :
                                                    <ChevronDown className="h-4 w-4 ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <span className="hidden sm:inline">Total</span>
                                        <span className="sm:hidden">Tot</span>
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {/* Asks (Sell Orders) - Red theme */}
                                {filteredAndSortedData.filteredAsks.map((ask, index) => {
                                    const price = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
                                    const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
                                    const total = price * quantity;

                                    return (
                                        <tr
                                            key={`ask-${index}`}
                                            className="hover:bg-red-50 transition-all duration-200 group"
                                        >
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={ask.userName}>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                                                    <span className="truncate">{ask.userName || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                                                <span className="text-xs sm:text-sm">{formatQuantity(ask.quantity)}</span>
                                            </td>
                                            <td
                                                className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-red-600 cursor-pointer hover:text-red-800 hover:bg-red-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${selectedRow === index ? 'bg-red-100' : ''}`}
                                                onClick={() => handlePriceClick(price, 'sell')}
                                                onKeyDown={(e) => handleKeyDown(e, price, 'sell', index)}
                                                tabIndex={0}
                                                title="Click to use this price (Enter/Space to select, Arrow keys to navigate)"
                                                role="button"
                                                aria-label={`Sell price ${formatPrice(ask.price)} - Click to use this price`}
                                            >
                                                <span className="text-xs sm:text-sm">${formatPrice(ask.price)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                                <span className="text-xs sm:text-sm">${formatPrice(total)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 hidden md:table-cell">
                                                <span className="text-xs">{formatTimestamp(ask.timestamp)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Bids (Buy Orders) - Green theme */}
                                {filteredAndSortedData.filteredBids.map((bid, index) => {
                                    const price = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
                                    const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
                                    const total = price * quantity;

                                    return (
                                        <tr
                                            key={`bid-${index}`}
                                            className="hover:bg-green-50 transition-all duration-200 group"
                                        >
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={bid.userName}>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                                                    <span className="truncate">{bid.userName || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                                                <span className="text-xs sm:text-sm">{formatQuantity(bid.quantity)}</span>
                                            </td>
                                            <td
                                                className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-green-600 cursor-pointer hover:text-green-800 hover:bg-green-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${selectedRow === index + filteredAndSortedData.filteredAsks.length ? 'bg-green-100' : ''}`}
                                                onClick={() => handlePriceClick(price, 'buy')}
                                                onKeyDown={(e) => handleKeyDown(e, price, 'buy', index + filteredAndSortedData.filteredAsks.length)}
                                                tabIndex={0}
                                                title="Click to use this price (Enter/Space to select, Arrow keys to navigate)"
                                                role="button"
                                                aria-label={`Buy price ${formatPrice(bid.price)} - Click to use this price`}
                                            >
                                                <span className="text-xs sm:text-sm">${formatPrice(bid.price)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                                <span className="text-xs sm:text-sm">${formatPrice(total)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 hidden md:table-cell">
                                                <span className="text-xs">{formatTimestamp(bid.timestamp)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Enhanced Empty States */}
                        {filteredAndSortedData.filteredBids.length === 0 && filteredAndSortedData.filteredAsks.length === 0 && !loading && (
                            <div className="p-12 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <TrendingUp className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        {searchTerm ? 'No orders match your search criteria.' : 'No orderbook data available for this symbol.'}
                                    </p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12">
                    <div className="text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="mt-2 text-sm">No orderbook data available</p>
                    </div>
                </div>
            )}

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
