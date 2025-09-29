'use client';

import { Fragment, useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ordersAPI, portfolioAPI } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface BackendBalance {
    symbol: string;
    amount: number;
    locked: number;
    total: number;
    costPrice: number | null;
    createdAt: string;
    updatedAt: string;
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    open: { status: boolean, type: "buy" | "sell", currentBalance: number };
    onClose: () => void;
    title?: string | React.ReactNode;
    size?: ModalSize;
    showCloseButton?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement>;
    footer?: React.ReactNode;
    onClick?: () => void;
    symbol?: string;
    currentPrice?: number;
    p2p?: boolean;
    sellerId?: number;
}

const sizeClasses: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
    full: 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl',
};

export default function OrderModal({
    open,
    onClose,
    title,
    size = 'lg',
    showCloseButton = true,
    initialFocusRef,
    footer,
    symbol = 'BTC-USD',
    currentPrice,
    p2p = false,
    sellerId,
}: ModalProps) {

    const defaultInitialFocus = useRef<HTMLButtonElement>(null);
    const { cryptoPrices, isConnected } = useWebSocket();
    const { user } = useAuth();

    // Order form state
    const [orderData, setOrderData] = useState({
        symbol: symbol,
        side: open.type === 'buy' ? 'BUY' as 'BUY' | 'SELL' : 'SELL' as 'BUY' | 'SELL',
        type: 'LIMIT' as 'MARKET' | 'LIMIT',
        quantity: '',
        price: '',
        clientOrderId: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [balances, setBalances] = useState<{ asset: string; available: number; locked: number; total: number }[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(false);
    // Price validation removed
    const [realTimePrice, setRealTimePrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

    // Update real-time price when crypto prices change
    useEffect(() => {
        if (cryptoPrices.length > 0) {
            const currentCrypto = cryptoPrices.find(crypto => crypto.symbol === symbol);
            if (currentCrypto) {
                setRealTimePrice(currentCrypto.price);
                setPriceChange(currentCrypto.regularMarketChange);
                setPriceChangePercent(currentCrypto.regularMarketChangePercent);
            }
        }
    }, [cryptoPrices, symbol]);

    // Update price field for market orders when real-time price changes
    useEffect(() => {
        if (realTimePrice && orderData.type === 'MARKET') {
            setOrderData(prev => ({
                ...prev,
                price: realTimePrice.toFixed(2)
            }));
        }
    }, [realTimePrice, orderData.type]);

    // Initialize order data when modal first opens
    useEffect(() => {
        if (open.status) {
            const marketPrice = realTimePrice || currentPrice;
            setOrderData({
                symbol: symbol,
                side: open.type === 'buy' ? 'BUY' as 'BUY' | 'SELL' : 'SELL' as 'BUY' | 'SELL',
                type: p2p ? 'LIMIT' as 'MARKET' | 'LIMIT' : 'MARKET' as 'MARKET' | 'LIMIT',
                quantity: '',
                price: marketPrice ? marketPrice.toFixed(2) : '',
                clientOrderId: '',
            });
            setMessage(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open.status, symbol, open.type, p2p]); // Intentionally excluding realTimePrice and currentPrice to avoid overriding user selections

    // Update price when real-time price changes (for initialization)
    useEffect(() => {
        if (open.status && realTimePrice && !orderData.price) {
            setOrderData(prev => ({
                ...prev,
                price: realTimePrice.toFixed(2)
            }));
        }
    }, [open.status, realTimePrice, orderData.price]);

    // Fetch user balances
    useEffect(() => {
        if (!open.status) return;

        const fetchBalances = async () => {
            setLoadingBalances(true);
            try {
                const response = await portfolioAPI.getBalances();
                console.log('Raw balance response:', response.data);
                const mappedBalances = response.data.balances.map((balance: BackendBalance) => ({
                    asset: balance.symbol,
                    available: balance.amount,
                    locked: balance.locked,
                    total: balance.total
                }));
                console.log('Mapped balances:', mappedBalances);
                setBalances(mappedBalances);
            } catch (error) {
                console.error('Failed to fetch balances:', error);
                setBalances([]);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, [open.status]);

    // Get available balance for the appropriate asset
    const getAvailableBalance = useCallback(() => {
        if (loadingBalances || balances.length === 0) {
            return 0;
        }

        if (orderData.side === 'SELL') {
            // For sell orders, we need the base asset (what we're selling)
            const baseAsset = orderData.symbol.split('-')[0];
            const balance = balances.find(b => b.asset === orderData.symbol);
            console.log('SELL balance check:', { baseAsset, balance, allBalances: balances });
            return balance ? balance.available : 0;
        } else {
            // For buy orders, we need the quote asset (USD to buy with)
            const quoteAsset = orderData.symbol.split('-')[1];
            const balance = balances.find(b => b.asset === quoteAsset);
            console.log('BUY balance check:', { quoteAsset, balance, allBalances: balances });
            return balance ? balance.available : 0;
        }
    }, [orderData.symbol, orderData.side, balances, loadingBalances]);

    const availableBalance = getAvailableBalance();

    // Debug available balance changes
    useEffect(() => {
        console.log('Available balance changed:', {
            availableBalance,
            orderDataSide: orderData.side,
            orderDataSymbol: orderData.symbol,
            balances,
            loadingBalances
        });
    }, [availableBalance, orderData.side, orderData.symbol, balances, loadingBalances]);

    // Price validation removed - users can enter any price

    // Handle order type changes
    const handleOrderTypeChange = (type: 'MARKET' | 'LIMIT') => {
        const marketPrice = realTimePrice || currentPrice;
        setOrderData(prev => ({
            ...prev,
            type,
            price: type === 'MARKET' && marketPrice ? marketPrice.toFixed(2) : prev.price
        }));
    };

    // Memoized handlers to prevent re-renders
    const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuantity = e.target.value;
        setOrderData(prev => {
            const updated = { ...prev, quantity: newQuantity };

            // For P2P mode, users can input total value directly
            // No automatic price calculation needed

            return updated;
        });

        // Real-time validation for both buy and sell orders
        if (newQuantity) {
            const requestedQuantity = parseFloat(newQuantity);
            const available = getAvailableBalance();

            if (requestedQuantity > available) {
                const asset = orderData.side === 'SELL' ? orderData.symbol.split('-')[0] : orderData.symbol.split('-')[1];
                setMessage({
                    type: 'error',
                    text: `You can only ${orderData.side.toLowerCase()} up to ${available.toFixed(2)} ${asset}. You entered ${requestedQuantity.toFixed(2)} ${asset}.`
                });
            } else {
                // Clear error message if quantity is valid
                setMessage(null);
            }
        }
    }, [orderData.side, orderData.symbol, getAvailableBalance]);

    const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setOrderData(prev => ({ ...prev, price: e.target.value }));
    }, []);

    // Memoized percentage handlers
    const handlePercentageClick = useCallback((percentage: number) => {
        setOrderData(prev => ({
            ...prev,
            quantity: (availableBalance * percentage).toFixed(2)
        }));
    }, [availableBalance]);

    const validateForm = () => {
        if (!orderData.quantity || parseFloat(orderData.quantity) <= 0) {
            setMessage({ type: 'error', text: 'Quantity must be greater than 0' });
            return false;
        }

        if (orderData.type === 'LIMIT' && (!orderData.price || parseFloat(orderData.price) <= 0)) {
            setMessage({ type: 'error', text: 'Price must be greater than 0 for limit orders' });
            return false;
        }

        // Price validation removed - users can enter any price

        // Check balance for both buy and sell orders
        const requestedQuantity = parseFloat(orderData.quantity) || 0;
        const available = getAvailableBalance();

        if (requestedQuantity > available) {
            const asset = orderData.side === 'SELL' ? orderData.symbol.split('-')[0] : orderData.symbol.split('-')[1];
            setMessage({ type: 'error', text: `Insufficient balance. You can only ${orderData.side.toLowerCase()} up to ${available.toFixed(2)} ${asset}. You entered ${requestedQuantity.toFixed(2)} ${asset}.` });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            console.log("herre", orderData);

            const response = await ordersAPI.placeOrder({
                symbol: orderData.symbol,
                side: orderData.side,
                type: orderData.type,
                quantity: orderData.quantity,
                price: orderData.price,
                timeInForce: orderData.type === 'MARKET' ? 'IOC' : 'GTC',
                clientOrderId: orderData.clientOrderId || undefined,
                currentBalance: open.currentBalance,
                p2p: p2p,
                sellerId: p2p ? sellerId : undefined,
                userId: user?.id,
            });

            console.log('Order placement response:', response.data);
            const orderId = response.data.id || response.data.orderId;
            setMessage({ type: 'success', text: `Order placed successfully! Order ID: ${orderId}` });

            // Reset form
            const marketPrice = realTimePrice || currentPrice;
            setOrderData({
                symbol: symbol,
                side: open.type === 'buy' ? 'BUY' as 'BUY' | 'SELL' : 'SELL' as 'BUY' | 'SELL',
                type: 'MARKET' as 'MARKET' | 'LIMIT', // Reset to MARKET as default
                quantity: '',
                price: marketPrice ? marketPrice.toFixed(2) : '',
                clientOrderId: '',
            });
        } catch (error: unknown) {
            console.error('Order placement error:', error);
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err.response?.data?.message || err.message || 'Failed to place order';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={open.status} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={onClose}
                initialFocus={initialFocusRef ?? defaultInitialFocus}
            >
                {/* Overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
                </Transition.Child>

                {/* Panel */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-end sm:items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel
                                className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white p-0 text-left shadow-2xl transition-all`}
                            >
                                {/* Header */}
                                {(title || showCloseButton) && (
                                    <div className="flex items-center justify-between border-b px-5 py-4">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                                            {title}
                                        </Dialog.Title>
                                        {showCloseButton && (
                                            <button
                                                ref={defaultInitialFocus}
                                                onClick={onClose}
                                                aria-label="Close modal"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Order Form Content */}
                                <div className="px-6 py-6">
                                    {/* Real-Time Price Display */}
                                    {(realTimePrice || currentPrice) && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Activity className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-red-500'}`} />
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
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl font-bold text-blue-900">
                                                            ${(realTimePrice || currentPrice || 0).toFixed(2)}
                                                        </span>
                                                        {realTimePrice && (
                                                            <div className={`flex items-center space-x-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {priceChange >= 0 ? (
                                                                    <TrendingUp className="h-4 w-4" />
                                                                ) : (
                                                                    <TrendingDown className="h-4 w-4" />
                                                                )}
                                                                <span className="text-sm font-semibold">
                                                                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* {orderData.type === 'LIMIT' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setOrderData({ ...orderData, price: (realTimePrice || currentPrice || 0).toFixed(2) })}
                                                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                                                    >
                                                        Use Live Price
                                                    </button>
                                                )} */}
                                            </div>
                                        </div>
                                    )}

                                    {message && (
                                        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {message.text}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Symbol Display */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Symbol
                                            </label>
                                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                                                {orderData.symbol}
                                            </div>
                                        </div>

                                        {/* Buy/Sell Toggle */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Buy/Sell</label>
                                            <div className="flex space-x-2">
                                                {open.type === 'buy' ? <button
                                                    type="button"
                                                    onClick={() => setOrderData({ ...orderData, side: 'BUY' })}
                                                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium ${orderData.side === 'BUY'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <TrendingUp className="h-4 w-4 mr-1" />
                                                    BUY
                                                </button> : <button
                                                    type="button"
                                                    onClick={() => setOrderData({ ...orderData, side: 'SELL' })}
                                                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium ${orderData.side === 'SELL'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <TrendingDown className="h-4 w-4 mr-1" />
                                                    SELL
                                                </button>}


                                            </div>
                                        </div>

                                        {/* Order Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Order Type
                                                {p2p && (
                                                    <span className="ml-2 text-xs text-gray-500">(P2P Mode - Fixed to Limit)</span>
                                                )}
                                            </label>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => !p2p && handleOrderTypeChange('LIMIT')}
                                                    disabled={p2p}
                                                    className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'LIMIT'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        } ${p2p ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    Limit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => !p2p && handleOrderTypeChange('MARKET')}
                                                    disabled={p2p}
                                                    className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'MARKET'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        } ${p2p ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    Market
                                                </button>
                                            </div>
                                            {orderData.type === 'MARKET' && !p2p && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Market orders execute immediately at the best available price
                                                </p>
                                            )}
                                            {p2p && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    P2P orders are limit orders that match with other users
                                                </p>
                                            )}
                                        </div>

                                        {/* P2P Toggle */}

                                        {/* Quantity and Price */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                                                    Quantity
                                                    {orderData.side === 'SELL' && (
                                                        <span className="ml-2 text-sm text-gray-500">
                                                            (Available: {loadingBalances ? 'Loading...' : `${availableBalance.toFixed(2)} ${orderData.symbol.split('-')[0]}`})
                                                        </span>
                                                    )}
                                                    {orderData.side === 'BUY' && (
                                                        <span className="ml-2 text-sm text-gray-500">
                                                            (Available: {loadingBalances ? 'Loading...' : `${availableBalance.toFixed(2)} ${orderData.symbol.split('-')[1]}`})
                                                        </span>
                                                    )}
                                                </label>
                                                <input
                                                    type="number"
                                                    id="quantity"
                                                    required
                                                    step="0.00000001"
                                                    min="0"
                                                    max={availableBalance}
                                                    placeholder="0.00000000"
                                                    value={orderData.quantity}
                                                    onChange={handleQuantityChange}
                                                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${orderData.quantity && parseFloat(orderData.quantity) > availableBalance
                                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                                                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                                                        }`}
                                                />
                                                {orderData.side === 'SELL' && !loadingBalances && (
                                                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePercentageClick(0.25)}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            25%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePercentageClick(0.5)}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            50%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePercentageClick(0.75)}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            75%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePercentageClick(1)}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            Max
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                                    {p2p ? 'Total Value (USD)' : (orderData.type === 'MARKET' ? 'Market Price (USD)' : 'Price (USD)')}
                                                    {(realTimePrice || currentPrice) && (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            ({realTimePrice ? 'Live' : 'Current'}: ${(realTimePrice || currentPrice || 0).toFixed(2)})
                                                        </span>
                                                    )}

                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        id="price"
                                                        required
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={orderData.price}
                                                        onChange={orderData.type === 'LIMIT' || p2p ? handlePriceChange : undefined}
                                                        readOnly={orderData.type === 'MARKET' && !p2p}
                                                        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${(orderData.type === 'MARKET' && !p2p) ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                                                    />
                                                    {orderData.type === 'MARKET' && !p2p && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Market orders execute at the current live price
                                                        </p>
                                                    )}
                                                    {p2p && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Enter the total USD value you want to spend (for buy) or receive (for sell)
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${orderData.side === 'BUY'
                                                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {loading ? 'Placing Order...' : `${p2p ? 'P2P ' : ''}${orderData.side} ${orderData.symbol}`}
                                        </button>
                                    </form>
                                </div>

                                {/* Footer */}
                                {footer && (
                                    <div className="border-t px-5 py-4 bg-gray-50">
                                        {footer}
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}