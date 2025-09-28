'use client';

import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
} from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
    Wifi,
    WifiOff,
    Activity,
    Star,
    StarOff,
    RefreshCw,
    Eye,
    Search,
    ArrowUpDown,
    Minus,
    Plus,
    AlertCircle,
    Clock,
    BarChart3,
} from 'lucide-react';
import OrderModal from './OrderModal';


type SortKey = 'price' | 'change' | 'marketCap';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'table';


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
    const { isConnected, cryptoPrices, subscribeToCryptoPrices, unsubscribeFromCryptoPrices, error } = useWebSocket();

    const [sortBy, setSortBy] = useLocalStorage<SortKey>('rtc-sortBy', 'marketCap');
    const [sortOrder, setSortOrder] = useLocalStorage<SortOrder>('rtc-sortOrder', 'desc');
    const [rawFilter, setRawFilter] = useLocalStorage<string>('rtc-filter', '');
    const filter = useDebounced(rawFilter, 250);
    const [favorites, setFavorites] = useLocalStorage<string[]>('crypto-favorites', []);
    const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('rtc-viewMode', 'table');
    const [showOnlyFavorites, setShowOnlyFavorites] = useLocalStorage<boolean>('rtc-onlyFav', false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [openModal, setOpenModal] = useState<{ status: boolean, type: "buy" | "sell", symbol?: string, currentPrice?: number }>({
        status: false, type: "buy", symbol: undefined, currentPrice: undefined
    });
    // Subscribe/unsubscribe once connection is available
    useEffect(() => {
        if (!isConnected) return;
        subscribeToCryptoPrices();
        return () => unsubscribeFromCryptoPrices();
    }, [isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices]);


    const toggleFavorite = useCallback((symbol: string) => {
        setFavorites((prev) => {
            const set = new Set(prev);
            if (set.has(symbol)) set.delete(symbol); else set.add(symbol);
            return Array.from(set);
        });
    }, [setFavorites]);

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


    const lastUpdated = useMemo(() => {
        if (!cryptoPrices.length) return null;
        return new Date(Math.max(...cryptoPrices.map((p) => p.timestamp))).toLocaleTimeString();
    }, [cryptoPrices]);

    const filteredSorted = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const list = cryptoPrices.filter((c) => {
            const matches = !q || c.symbol.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q);
            const isFavOk = showOnlyFavorites ? favoritesSet.has(c.symbol) : true;
            return matches && isFavOk;
        });

        // Favorites first – but stable
        list.sort((a, b) => {
            const aFav = favoritesSet.has(a.symbol);
            const bFav = favoritesSet.has(b.symbol);
            if (aFav !== bFav) return aFav ? -1 : 1;
            let av = 0, bv = 0;
            if (sortBy === 'price') { av = a.price; bv = b.price; }
            else if (sortBy === 'change') { av = a.regularMarketChangePercent; bv = b.regularMarketChangePercent; }
            else { av = a.marketCap; bv = b.marketCap; }
            return sortOrder === 'asc' ? av - bv : bv - av;
        });

        return list;
    }, [cryptoPrices, filter, favoritesSet, showOnlyFavorites, sortBy, sortOrder]);


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
                                <div className="text-sm font-medium text-gray-700">{lastUpdated ?? 'Never'}</div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
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

                    {/* Favorites / View */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowOnlyFavorites((v) => !v)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${showOnlyFavorites ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            aria-pressed={showOnlyFavorites}
                            aria-label="Toggle favorites filter"
                        >
                            {showOnlyFavorites ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                            <span className="text-sm font-medium">Favorites</span>
                        </button>

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
                            <div className="grid grid-cols-6 gap-4 px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl font-semibold text-gray-700 text-sm border border-gray-200/50">
                                <div className="col-span-2 flex items-center space-x-2">
                                    <Star className="h-4 w-4" />
                                    <span>Asset</span>
                                </div>
                                <div className="text-right">Price</div>
                                <div className="text-right">24h Change</div>
                                <div className="text-right">Market Cap</div>
                                <div className="text-center">Actions</div>
                            </div>

                            {/* Body */}
                            <div className="space-y-3 mt-3">
                                {filteredSorted.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center space-y-3">
                                            <Activity className="h-12 w-12 text-gray-300" />
                                            <div className="text-lg font-medium">{isConnected ? 'No cryptocurrencies found' : 'Connecting to real-time data...'}</div>
                                            <div className="text-sm">{isConnected ? 'Try adjusting your search or filters' : 'Please wait while we connect to the market'}</div>
                                        </div>
                                    </div>
                                ) : (
                                    filteredSorted.map((crypto, index) => (
                                        <div
                                            key={crypto.symbol}
                                            className={`grid grid-cols-6 gap-4 px-4 py-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:shadow-lg hover:border-gray-300/50 transition-all duration-300 ${favoritesSet.has(crypto.symbol) ? 'ring-2 ring-yellow-200/50 bg-yellow-50/30' : ''}`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Asset */}
                                            <div className="col-span-2 flex items-center space-x-3">
                                                <div className="relative">
                                                    <div className={`w-10 h-10 bg-gradient-to-br ${getCryptoIcon(crypto.symbol)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                                        {crypto.symbol.charAt(0)}
                                                    </div>
                                                    {favoritesSet.has(crypto.symbol) && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                                            <Star className="h-2.5 w-2.5 text-white fill-current" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 flex items-center space-x-2">
                                                        <span>{crypto.symbol.replace('-USD', '')}</span>
                                                        <button onClick={() => toggleFavorite(crypto.symbol)} className="hover:scale-110 transition-transform" aria-label="Toggle favorite">
                                                            {favoritesSet.has(crypto.symbol) ? <Star className="h-4 w-4 text-yellow-400 fill-current" /> : <StarOff className="h-4 w-4 text-gray-400" />}
                                                        </button>
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


                                            {/* Actions */}
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => setOpenModal({ status: true, type: "buy", symbol: crypto.symbol, currentPrice: crypto.price })}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                                                    aria-label={`Buy ${crypto.symbol}`}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    <span>Buy</span>
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
                        {filteredSorted.map((crypto, index) => (
                            <div
                                key={crypto.symbol}
                                className={`bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300 ${favoritesSet.has(crypto.symbol) ? 'ring-2 ring-yellow-200/50 bg-yellow-50/30' : ''}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 bg-gradient-to-br ${getCryptoIcon(crypto.symbol)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                        {crypto.symbol.charAt(0)}
                                    </div>
                                    <button onClick={() => toggleFavorite(crypto.symbol)} className="hover:scale-110 transition-transform" aria-label="Toggle favorite">
                                        {favoritesSet.has(crypto.symbol) ? <Star className="h-5 w-5 text-yellow-400 fill-current" /> : <StarOff className="h-5 w-5 text-gray-400" />}
                                    </button>
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
                                        onClick={() => setOpenModal({ status: true, type: "buy", symbol: crypto.symbol, currentPrice: crypto.price })}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                        aria-label={`Buy ${crypto.symbol}`}
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>Buy</span>
                                    </button>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="px-6 pt-6 border-t border-gray-200/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{cryptoPrices.length}</div>
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

                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Star className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{favoritesSet.size}</div>
                                <div className="text-sm text-gray-500">Favorites</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <OrderModal
                symbol={openModal.symbol}
                currentPrice={openModal.currentPrice}
                open={openModal}
                onClose={() => { setOpenModal({ status: false, type: "buy", symbol: undefined, currentPrice: undefined }); }}
                title="Order"
            />

        </div>
    );
};

export default RealTimeCryptoDashboard;
