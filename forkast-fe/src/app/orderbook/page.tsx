'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { orderbookAPI } from '@/lib/api';
import { useCryptoSymbols } from '@/lib/useCryptoSymbols';
import {
    TrendingUp,
    TrendingDown,
    Users,
    Search,
    ChevronUp,
    ChevronDown,
    BarChart3,
    Activity,
    Wifi,
    WifiOff,
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import ButtonComponent from '@/components/ui/Button';
import OrderModal from '@/components/trading/OrderModal';

interface OrderBookEntry {
    price: number | string;
    quantity: number | string;
    total?: number | string;
    userName?: string;
    email?: string;
}

interface OrderBookData {
    symbol: string;
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    timestamp: string;
    email?: string;
}

interface Order {
    symbol: string;
    price: number;
    quantity: number;
    user: {
        name: string;
        email: string;
    };
}
export default function OrderBookPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { cryptoPrices, isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices } = useWebSocket();
    const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [symbol, setSymbol] = useState('BTC-USD');
    const [orderFilter, setOrderFilter] = useState<'all' | 'buy' | 'sell'>('all');

    // Enhanced UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [showZeroVolume] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Order modal state
    const [orderModal, setOrderModal] = useState<{
        isOpen: boolean;
        type: 'buy' | 'sell';
        suggestedPrice: number;
    }>({
        isOpen: false,
        type: 'buy',
        suggestedPrice: 0
    });

    const { cryptos: cryptoSymbols } = useCryptoSymbols();
    console.log(user);

    // Real-time price data
    const realTimePrice = useMemo(() => {
        const currentCrypto = cryptoPrices.find(crypto => crypto.symbol === symbol);
        return currentCrypto ? currentCrypto.price : null;
    }, [cryptoPrices, symbol]);

    const realTimePriceChange = useMemo(() => {
        const currentCrypto = cryptoPrices.find(crypto => crypto.symbol === symbol);
        return currentCrypto ? currentCrypto.regularMarketChangePercent : 0;
    }, [cryptoPrices, symbol]);

    // Subscribe to WebSocket updates
    useEffect(() => {
        if (isConnected) {
            subscribeToCryptoPrices();
            return () => unsubscribeFromCryptoPrices();
        }
    }, [isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices]);

    // Enhanced utility functions
    const formatPrice = useCallback((price: number | string | null | undefined) => {
        if (price === null || price === undefined) return '0.00';
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (typeof numPrice !== 'number' || isNaN(numPrice)) return '0.00';
        return numPrice.toFixed(2);
    }, []);

    const formatQuantity = useCallback((quantity: number | string) => {
        const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        return isNaN(numQuantity) ? '0.00000000' : numQuantity.toFixed(8);
    }, []);


    const calculateSpread = (bestBid: number, bestAsk: number) => {
        return bestAsk - bestBid;
    };

    const calculateSpreadPercentage = (bestBid: number, bestAsk: number) => {
        return ((bestAsk - bestBid) / bestBid) * 100;
    };

    // Check if a price is close to real-time price for highlighting
    const isPriceCloseToRealTime = useCallback((price: number | string) => {
        if (!realTimePrice) return false;
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        const tolerance = realTimePrice * 0.02; // 2% tolerance
        return Math.abs(numPrice - realTimePrice) <= tolerance;
    }, [realTimePrice]);

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

                const bids = buys.map(b => ({ price: b.price, quantity: b.quantity, userName: b.user.name, email: b.user.email }));
                const asks = sells.map(s => ({ price: s.price, quantity: s.quantity, userName: s.user.name, email: s.user.email }));
                setOrderBook({ symbol, bids, asks, timestamp: new Date().toISOString() });
            } else {
                // Fallback to old format
                const { buys, sells }: { buys: Order[], sells: Order[] } = response.data;
                const bids = buys.map(b => ({ price: b.price, quantity: b.quantity, userName: b.user.name, email: b.user.email }));
                const asks = sells.map(s => ({ price: s.price, quantity: s.quantity, userName: s.user.name, email: s.user.email }));
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

    // Order modal handlers
    const handleOpenOrderModal = (type: 'buy' | 'sell', suggestedPrice: number) => {
        setOrderModal({
            isOpen: true,
            type,
            suggestedPrice
        });
    };

    const handleCloseOrderModal = () => {
        setOrderModal({
            isOpen: false,
            type: 'buy',
            suggestedPrice: 0
        });
    };

    const handleOrderPlaced = () => {
        // Refresh the orderbook data after placing an order
        fetchOrderBook(symbol);
    };


    // Enhanced data processing with market depth, grouping, and cumulative volumes
    const { processedBids, processedAsks } = useMemo(() => {
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
    }, [orderBook, showZeroVolume]);

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
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-300 text-black">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <BarChart3 className="h-6 w-6" />
                                    <h2 className="text-2xl font-bold">Order Book</h2>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded-full">
                                        {orderBook.symbol}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {isConnected ? (
                                        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <Wifi className="h-3 w-3" />
                                            <span className="text-xs font-medium">Live Data</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full border border-red-200">
                                            <WifiOff className="h-3 w-3" />
                                            <span className="text-xs font-medium">Offline</span>
                                        </div>
                                    )}
                                </div>
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

                    {/* Real-Time Price Display */}
                    {realTimePrice && (
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <Activity className={`h-5 w-5 ${isConnected ? 'text-green-600' : 'text-red-500'}`} />
                                        <span className="text-sm font-medium text-blue-900">
                                            {isConnected ? 'Live Market Price' : 'Current Market Price'}:
                                        </span>
                                        <div className={`flex items-center space-x-1 ${isConnected ? 'text-green-600' : 'text-blue-900'}`}>
                                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                            <span className="text-xs font-medium">
                                                {isConnected ? 'Live' : 'Static'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-900">
                                            ${realTimePrice.toFixed(2)}
                                        </div>
                                        <div className={`text-sm font-semibold ${realTimePriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {realTimePriceChange >= 0 ? (
                                                <div className="flex items-center space-x-1">
                                                    <TrendingUp className="h-4 w-4" />
                                                    <span>+{realTimePriceChange.toFixed(2)}%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-1">
                                                    <TrendingDown className="h-4 w-4" />
                                                    <span>{realTimePriceChange.toFixed(2)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {isConnected ? (
                                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                                                <Wifi className="h-3 w-3" />
                                                <span className="text-xs font-medium">Connected</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200">
                                                <WifiOff className="h-3 w-3" />
                                                <span className="text-xs font-medium">Offline</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
                                        Actions
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
                                            className="hover:bg-green-50 transition-all duration-200 group"
                                        >
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={ask.userName}>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                                                    <span className="truncate">{ask.userName || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                                                <span className="text-xs sm:text-sm">{formatQuantity(ask.quantity)}</span>
                                            </td>
                                            <td
                                                className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-green-600 cursor-pointer hover:text-green-800 hover:bg-green-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${isPriceCloseToRealTime(ask.price) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
                                                tabIndex={0}
                                                title="Click to buy at this price"
                                                role="button"
                                                aria-label={`Buy price ${formatPrice(ask.price)} - Click to buy at this price`}
                                                onClick={() => {
                                                    if (user?.email !== ask.email) {
                                                        const askPrice = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
                                                        handleOpenOrderModal('buy', askPrice);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-end space-x-1">
                                                    <span className="text-xs sm:text-sm">${formatPrice(ask.price)}</span>
                                                    {isPriceCloseToRealTime(ask.price) && (
                                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Close to real-time price"></div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                                <span className="text-xs sm:text-sm">${formatPrice(total)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 hidden md:table-cell">
                                                {user?.email !== ask.email ? (
                                                    <ButtonComponent
                                                        className='bg-green-500 hover:bg-green-600 text-white'
                                                        title='Buy'
                                                        onClick={() => {
                                                            const askPrice = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
                                                            handleOpenOrderModal('buy', askPrice);
                                                        }}
                                                    />
                                                ) : null}
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
                                            className="hover:bg-red-50 transition-all duration-200 group"
                                        >
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={bid.userName}>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                                                    <span className="truncate">{bid.userName || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                                                <span className="text-xs sm:text-sm">{formatQuantity(bid.quantity)}</span>
                                            </td>
                                            <td
                                                className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-red-600 cursor-pointer hover:text-red-800 hover:bg-red-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${isPriceCloseToRealTime(bid.price) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
                                                tabIndex={0}
                                                title="Click to sell at this price"
                                                role="button"
                                                aria-label={`Sell price ${formatPrice(bid.price)} - Click to sell at this price`}
                                                onClick={() => {
                                                    if (user?.email !== bid.email) {
                                                        const bidPrice = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
                                                        handleOpenOrderModal('sell', bidPrice);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-end space-x-1">
                                                    <span className="text-xs sm:text-sm">${formatPrice(bid.price)}</span>
                                                    {isPriceCloseToRealTime(bid.price) && (
                                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Close to real-time price"></div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                                <span className="text-xs sm:text-sm">${formatPrice(total)}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 hidden md:table-cell">
                                                {user?.email !== bid.email ? (
                                                    <ButtonComponent
                                                        className='bg-red-500 hover:bg-red-600 text-white'
                                                        title='Sell'
                                                        onClick={() => {
                                                            const bidPrice = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
                                                            handleOpenOrderModal('sell', bidPrice);
                                                        }}
                                                    />
                                                ) : null}
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

            {/* Order Modal */}
            <OrderModal
                open={{ status: orderModal.isOpen, type: orderModal.type }}
                onClose={handleCloseOrderModal}
                title={`${orderModal.type === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
                size="lg"
                symbol={symbol}
                currentPrice={realTimePrice || orderModal.suggestedPrice}
                onClick={handleOrderPlaced}
            />
        </div>
    );
}
