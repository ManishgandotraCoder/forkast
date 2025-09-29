'use client';

import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useCryptoPrices } from '@/lib/useCryptoPrices';
import {
    Wifi,
    WifiOff,
    Activity,
    RefreshCw,
    Eye,
    Search,
    ArrowUpDown,
    Plus,
    AlertCircle,
    Clock,
    BarChart3,
    TrendingDown,
} from 'lucide-react';
import OrderModal from './OrderModal';


type SortKey = 'price' | 'change' | 'marketCap';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'table';

interface CryptoData {
    symbol: string;
    price: number;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap: number;
    timestamp?: number;
    previousPrice?: number;
}


/**
 * Small hooks
 */
function useLocalStorage<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
            return raw ? (JSON.parse(raw) as T) : initial;
        } catch {
            return initial;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            /* ignore quota errors */
        }
    }, [key, value]);

    return [value, setValue] as const;
}

function useDebounced<T>(value: T, delay = 200) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

/**
 * Component
 */
const RealTimeCryptoDashboard: React.FC = () => {
    const { isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices, error: wsError } = useWebSocket();
    const { data: cryptoPrices = [], loading: cryptoLoading, error: cryptoError } = useCryptoPrices();

    const [sortBy, setSortBy] = useLocalStorage<SortKey>('rtc-sortBy', 'marketCap');
    const [sortOrder, setSortOrder] = useLocalStorage<SortOrder>('rtc-sortOrder', 'desc');
    const [rawFilter, setRawFilter] = useLocalStorage<string>('rtc-filter', '');
    const filter = useDebounced(rawFilter, 250);
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('rtc-viewMode', 'table');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [openModal, setOpenModal] = useState<{ status: boolean, type: "buy" | "sell", symbol?: string, currentPrice?: number, currentBalance?: number }>({
        status: false, type: "buy", symbol: undefined, currentPrice: undefined
    });
    // Subscribe/unsubscribe once connection is available
    useEffect(() => {
        if (!isConnected) return;
        subscribeToCryptoPrices();
        return () => unsubscribeFromCryptoPrices();
    }, [isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices]);



    const formatPrice = (price: number) => (price >= 1
        ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${price.toFixed(6)}`);

    const formatMarketCap = (cap: number) => {
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
        if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
        return `$${cap.toLocaleString()}`;
    };

    const formatChange = (change: number, isPercent = false) => {
        const abs = isPercent ? `${Math.abs(change).toFixed(2)}%` : `$${Math.abs(change).toFixed(2)}`;
        const sign = change >= 0 ? '+' : '-';
        return `${sign}${abs}`;
    };

    const getChangeColor = (change: number) => (change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600');
    const getChangeBgColor = (change: number) => (change > 0 ? 'bg-green-50' : change < 0 ? 'bg-red-50' : 'bg-gray-50');

    const getCryptoIcon = (symbol: string) => {
        const colors = [
            'from-blue-500 to-blue-600',
            'from-purple-500 to-purple-600',
            'from-green-500 to-green-600',
            'from-orange-500 to-orange-600',
            'from-red-500 to-red-600',
            'from-indigo-500 to-indigo-600',
            'from-pink-500 to-pink-600',
            'from-teal-500 to-teal-600',
        ];
        const hash = symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise((r) => setTimeout(r, 800));
        setIsRefreshing(false);
    };

    // Combine WebSocket and API errors
    const error = wsError || cryptoError;


    const lastUpdated = useMemo(() => {
        if (!cryptoPrices || !cryptoPrices.length) return null;
        return new Date().toLocaleTimeString();
    }, [cryptoPrices]);

    const filteredSorted = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const list = (cryptoPrices || []).filter((c: CryptoData) => {
            const matches = !q || c.symbol.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q);
            return matches;
        });

        list.sort((a: CryptoData, b: CryptoData) => {
            let av = 0, bv = 0;
            if (sortBy === 'price') { av = a.price; bv = b.price; }
            else if (sortBy === 'change') { av = a.regularMarketChangePercent; bv = b.regularMarketChangePercent; }
            else { av = a.marketCap; bv = b.marketCap; }
            return sortOrder === 'asc' ? av - bv : bv - av;
        });

        return list;
    }, [cryptoPrices, filter, sortBy, sortOrder]);


    return (
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-xl shadow-xl border border-gray-100/50 backdrop-blur-sm">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5" />
                <div className="relative p-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                                    <Activity className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Real-Time Crypto Dashboard
                                    </h2>
                                    <p className="text-sm text-gray-500">Live market data & trading</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {isConnected ? (
                                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <Wifi className="h-3 w-3" />
                                        <span className="text-xs font-medium">Live</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200">
                                        <WifiOff className="h-3 w-3" />
                                        <span className="text-xs font-medium">Offline</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Last updated</div>
                                <div className="text-sm font-medium text-gray-700">
                                    {cryptoLoading ? 'Loading...' : (lastUpdated ?? 'Never')}
                                </div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing || cryptoLoading}
                                aria-label="Refresh"
                                className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                            >
                                <RefreshCw className="h-4 w-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {!!error && (
                <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="px-6 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search cryptocurrencies..."
                            value={rawFilter}
                            onChange={(e) => setRawFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
                            aria-label="Search cryptocurrencies"
                        />
                    </div>

                    {/* View */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode((m) => (m === 'table' ? 'grid' : 'table'))}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            aria-label="Toggle view mode"
                        >
                            {viewMode === 'table' ? <BarChart3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="text-sm font-medium">{viewMode === 'table' ? 'Grid' : 'Table'}</span>
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortKey)}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
                            aria-label="Sort by"
                        >
                            <option value="marketCap">Market Cap</option>
                            <option value="price">Price</option>
                            <option value="change">24h Change</option>
                        </select>

                        <button
                            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                            className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm transition-colors"
                            aria-label="Toggle sort order"
                        >
                            <ArrowUpDown className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-6 pb-6">
                {viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                        <div className="min-w-full">
                            {/* Header */}
                            <div className="grid grid-cols-7 gap-4 px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl font-semibold text-gray-700 text-sm border border-gray-200/50">
                                <div className="col-span-2 flex items-center space-x-2">
                                    <span>Asset</span>
                                </div>
                                <div className="text-right">Price</div>
                                <div className="text-right">24h Change</div>
                                <div className="text-right">Market Cap</div>
                                <div className="text-center">Buy</div>
                                <div className="text-center">Sell</div>
                            </div>

                            {/* Body */}
                            <div className="space-y-3 mt-3">
                                {cryptoLoading ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            <div className="text-lg font-medium">Loading crypto data...</div>
                                            <div className="text-sm">Please wait while we fetch the latest prices</div>
                                        </div>
                                    </div>
                                ) : filteredSorted.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center space-y-3">
                                            <Activity className="h-12 w-12 text-gray-300" />
                                            <div className="text-lg font-medium">{isConnected ? 'No cryptocurrencies found' : 'Connecting to real-time data...'}</div>
                                            <div className="text-sm">{isConnected ? 'Try adjusting your search or filters' : 'Please wait while we connect to the market'}</div>
                                        </div>
                                    </div>
                                ) : (
                                    filteredSorted.map((crypto: CryptoData, index: number) => (
                                        <div
                                            key={crypto.symbol}
                                            className="grid grid-cols-7 gap-4 px-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:shadow-lg hover:border-gray-300/50 transition-all duration-300"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Asset */}
                                            <div className="col-span-2 flex items-center space-x-3">
                                                <div className={`w-10 h-10 bg-gradient-to-br ${getCryptoIcon(crypto.symbol)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                                    {crypto.symbol.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">
                                                        <span>{crypto.symbol.replace('-USD', '')}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">{crypto.shortName}</div>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900">{formatPrice(crypto.price)}</div>
                                                {crypto.previousPrice !== undefined && (
                                                    <div className="text-xs text-gray-500">Prev: {formatPrice(crypto.previousPrice)}</div>
                                                )}
                                            </div>

                                            {/* Change */}
                                            <div className="text-right">
                                                <div className={`font-semibold ${getChangeColor(crypto.regularMarketChangePercent)}`}>
                                                    {formatChange(crypto.regularMarketChangePercent, true)}
                                                </div>
                                                <div className={`text-xs px-2 py-1 rounded-full inline-block ${getChangeBgColor(crypto.regularMarketChangePercent)} ${getChangeColor(crypto.regularMarketChange)}`}>
                                                    {formatChange(crypto.regularMarketChange)}
                                                </div>
                                            </div>

                                            {/* Market Cap */}
                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900">{formatMarketCap(crypto.marketCap)}</div>
                                            </div>


                                            {/* Buy Action */}
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => setOpenModal({ status: true, type: "buy", symbol: crypto.symbol, currentPrice: crypto.price, currentBalance: crypto.marketCap })}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                    aria-label={`Buy ${crypto.symbol}`}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    <span>Buy</span>
                                                </button>
                                            </div>

                                            {/* Sell Action */}
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => setOpenModal({ status: true, type: "sell", symbol: crypto.symbol, currentPrice: crypto.price, currentBalance: 0 })}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                    aria-label={`Sell ${crypto.symbol}`}
                                                >
                                                    <TrendingDown className="h-3 w-3" />
                                                    <span>Sell</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Grid view
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredSorted.map((crypto: CryptoData, index: number) => (
                            <div
                                key={crypto.symbol}
                                className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 bg-gradient-to-br ${getCryptoIcon(crypto.symbol)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                        {crypto.symbol.charAt(0)}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <h3 className="font-semibold text-gray-900 text-lg">{crypto.symbol.replace('-USD', '')}</h3>
                                    <p className="text-sm text-gray-500">{crypto.shortName}</p>
                                </div>

                                <div className="mb-3">
                                    <div className="text-xl font-bold text-gray-900 mb-1">{formatPrice(crypto.price)}</div>
                                    <div className={`font-semibold ${getChangeColor(crypto.regularMarketChangePercent)}`}>
                                        {formatChange(crypto.regularMarketChangePercent, true)}
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setOpenModal({ status: true, type: "buy", symbol: crypto.symbol, currentPrice: crypto.price, currentBalance: crypto.marketCap })}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                        aria-label={`Buy ${crypto.symbol}`}
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>Buy</span>
                                    </button>
                                    <button
                                        onClick={() => setOpenModal({ status: true, type: "sell", symbol: crypto.symbol, currentPrice: crypto.price, currentBalance: 0 })}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                        aria-label={`Sell ${crypto.symbol}`}
                                    >
                                        <TrendingDown className="h-3 w-3" />
                                        <span>Sell</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="px-6 pt-6 border-t border-gray-200/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{cryptoPrices?.length || 0}</div>
                                <div className="text-sm text-gray-500">Assets Tracked</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                                {isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{isConnected ? 'Live' : 'Offline'}</div>
                                <div className="text-sm text-gray-500">Connection</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Clock className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{lastUpdated ?? '--:--:--'}</div>
                                <div className="text-sm text-gray-500">Last Update</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <OrderModal
                symbol={openModal.symbol}
                currentPrice={openModal.currentPrice}
                open={{
                    ...openModal,
                    currentBalance: openModal.currentBalance ?? 0,
                }}
                onClose={() => { setOpenModal({ status: false, type: "buy", symbol: undefined, currentPrice: undefined, currentBalance: undefined }); }}
                title="Order"
                p2p={false}
            />

        </div>
    );
};

export default RealTimeCryptoDashboard;
