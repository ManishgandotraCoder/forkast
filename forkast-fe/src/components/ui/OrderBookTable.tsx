import React, { useState, useMemo, useCallback, memo } from 'react';
import { TrendingUp, TrendingDown, Users, Clock, RefreshCw, Filter, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T = unknown> {
    key: string;
    label: string;
    render?: (value: unknown, row: T, index?: number) => React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
}

interface OrderBookEntry {
    price: number | string;
    quantity: number | string;
    total?: number | string;
    userName?: string;
    timestamp?: string;
    orderId?: string;
    cumulativeVolume?: number;
}

interface OrderBookDataTableProps<T = unknown> {
    title: string;
    subtitle?: string;
    columns?: Column<T>[];
    data?: T[];
    loading?: boolean;
    error?: string | null;
    emptyMessage?: string;
    timestamp?: string;
    onRowClick?: (row: T) => void;
    onRefresh?: () => void;
    onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
    // OrderBook specific props
    isOrderBook?: boolean;
    symbol?: string;
    bids?: OrderBookEntry[];
    asks?: OrderBookEntry[];
    showDepth?: boolean;
    maxDepth?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

// Memoized component for better performance
const OrderBookDataTable = memo<OrderBookDataTableProps>(({
    title,
    subtitle,
    loading = false,
    error = null,
    symbol,
    bids = [],
    asks = [],
    timestamp,
    onRefresh,
    onPriceClick,
    showDepth = true,
    maxDepth = 10
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);

    const formatPrice = (price: number | string | null | undefined) => {
        if (price === null || price === undefined) return '0.00';
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (typeof numPrice !== 'number' || isNaN(numPrice)) return '0.00';
        return numPrice.toFixed(2);
    };

    const formatQuantity = (quantity: number | string) => {
        const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        return isNaN(numQuantity) ? '0.00000000' : numQuantity.toFixed(8);
    };

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Calculate market depth and cumulative volumes
    const { processedBids, processedAsks, maxVolume } = useMemo(() => {
        const sortedBids = [...bids].sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return priceB - priceA; // Highest price first
        }).slice(0, maxDepth);

        const sortedAsks = [...asks].sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return priceA - priceB; // Lowest price first
        }).slice(0, maxDepth);

        // Calculate cumulative volumes
        let cumulativeBidVolume = 0;
        const processedBids = sortedBids.map(bid => {
            const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
            cumulativeBidVolume += quantity;
            return {
                ...bid,
                cumulativeVolume: cumulativeBidVolume
            };
        });

        let cumulativeAskVolume = 0;
        const processedAsks = sortedAsks.map(ask => {
            const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
            cumulativeAskVolume += quantity;
            return {
                ...ask,
                cumulativeVolume: cumulativeAskVolume
            };
        });

        const maxVolume = Math.max(cumulativeBidVolume, cumulativeAskVolume);

        return { processedBids, processedAsks, maxVolume };
    }, [bids, asks, maxDepth]);

    // Filter and sort data
    const filteredAndSortedData = useMemo(() => {
        let filteredBids = processedBids;
        let filteredAsks = processedAsks;

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
    }, [processedBids, processedAsks, searchTerm, sortConfig]);

    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const handleRefresh = useCallback(async () => {
        if (onRefresh) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
    }, [onRefresh]);

    const handlePriceClick = useCallback((price: number, side: 'buy' | 'sell') => {
        if (onPriceClick) {
            onPriceClick(price, side);
        }
    }, [onPriceClick]);

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

    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Enhanced Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        </div>
                        {symbol && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                {symbol}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {timestamp && (
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatTimestamp(timestamp)}
                            </div>
                        )}
                        {onRefresh && (
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex items-center space-x-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <Filter className="h-4 w-4 mr-1" />
                        Filters
                    </button>
                </div>

                {subtitle && (
                    <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
                )}
            </div>

            {/* Market Summary */}
            {processedBids.length > 0 || processedAsks.length > 0 ? (
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {processedBids.length > 0 ? formatPrice(processedBids[0].price) : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Best Bid</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">
                                {processedBids.length > 0 && processedAsks.length > 0 ?
                                    formatPrice(parseFloat(formatPrice(processedAsks[0].price)) - parseFloat(formatPrice(processedBids[0].price))) :
                                    'N/A'
                                }
                            </div>
                            <div className="text-sm text-gray-600">Spread</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {processedAsks.length > 0 ? formatPrice(processedAsks[0].price) : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Best Ask</div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Market Depth Visualization */}
            {showDepth && (processedBids.length > 0 || processedAsks.length > 0) && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">Market Depth</div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <div className="text-xs text-green-600 font-medium mb-1">Bids (Buy Orders)</div>
                            <div className="space-y-1">
                                {processedBids.slice(0, 5).map((bid, index) => (
                                    <div key={index} className="flex items-center">
                                        <div
                                            className="h-2 bg-green-200 rounded-l"
                                            style={{
                                                width: `${(bid.cumulativeVolume / maxVolume) * 100}%`
                                            }}
                                        />
                                        <div className="ml-2 text-xs text-gray-600">
                                            {formatPrice(bid.price)} - {formatQuantity(bid.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-red-600 font-medium mb-1">Asks (Sell Orders)</div>
                            <div className="space-y-1">
                                {processedAsks.slice(0, 5).map((ask, index) => (
                                    <div key={index} className="flex items-center">
                                        <div
                                            className="h-2 bg-red-200 rounded-l"
                                            style={{
                                                width: `${(ask.cumulativeVolume / maxVolume) * 100}%`
                                            }}
                                        />
                                        <div className="ml-2 text-xs text-gray-600">
                                            {formatPrice(ask.price)} - {formatQuantity(ask.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                        {/* Separator */}
                        {filteredAndSortedData.filteredAsks.length > 0 && filteredAndSortedData.filteredBids.length > 0 && (
                            <tr className="bg-gray-100">
                                <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-gray-500">
                                    --- Market Spread ---
                                </td>
                            </tr>
                        )}

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
                {filteredAndSortedData.filteredBids.length === 0 && filteredAndSortedData.filteredAsks.length === 0 && !loading && !error && (
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

                {loading && (
                    <div className="p-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-3 text-sm">Loading orderbook data...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-12 text-center text-red-500">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <TrendingDown className="h-8 w-8 text-red-400" />
                            </div>
                            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

OrderBookDataTable.displayName = 'OrderBookDataTable';

export default OrderBookDataTable;