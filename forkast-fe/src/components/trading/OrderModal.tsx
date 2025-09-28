'use client';

import { Fragment, useRef, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ordersAPI, portfolioAPI } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';

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
}: ModalProps) {

    const defaultInitialFocus = useRef<HTMLButtonElement>(null);
    const { cryptoPrices, isConnected } = useWebSocket();

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
                type: 'MARKET' as 'MARKET' | 'LIMIT',
                quantity: '',
                price: marketPrice ? marketPrice.toFixed(2) : '',
                clientOrderId: '',
            });
            setMessage(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open.status, symbol, open.type]); // Intentionally excluding realTimePrice and currentPrice to avoid overriding user selections

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
                setBalances(response.data.balances);
            } catch (error) {
                console.error('Failed to fetch balances:', error);
                setBalances([]);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, [open.status]);

    // Get available balance for the base asset
    const getAvailableBalance = () => {
        const baseAsset = orderData.symbol.split('-')[0];
        const balance = balances.find(b => b.asset === baseAsset);
        return balance ? balance.available : 0;
    };

    const availableBalance = getAvailableBalance();

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

        if (orderData.side === 'SELL') {
            const requestedQuantity = parseFloat(orderData.quantity) || 0;
            const available = getAvailableBalance();

            if (requestedQuantity > available) {
                const baseAsset = orderData.symbol.split('-')[0];
                setMessage({ type: 'error', text: `Insufficient balance. Available: ${available.toFixed(2)} ${baseAsset}` });
                return false;
            }
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
            console.log("herre", open);

            const response = await ordersAPI.placeOrder({
                symbol: orderData.symbol,
                side: orderData.side,
                type: orderData.type,
                quantity: orderData.quantity,
                price: orderData.price,
                timeInForce: orderData.type === 'MARKET' ? 'IOC' : 'GTC',
                clientOrderId: orderData.clientOrderId || undefined,
                currentBalance: open.currentBalance,
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOrderTypeChange('LIMIT')}
                                                    className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'LIMIT'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Limit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOrderTypeChange('MARKET')}
                                                    className={`flex-1 px-4 py-2 rounded-md font-medium ${orderData.type === 'MARKET'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    Market
                                                </button>
                                            </div>
                                            {orderData.type === 'MARKET' && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Market orders execute immediately at the best available price
                                                </p>
                                            )}
                                        </div>

                                        {/* Quantity and Price */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                                                    Quantity
                                                    {orderData.side === 'SELL' && (
                                                        <span className="ml-2 text-sm text-gray-500">
                                                            (Available: {loadingBalances ? 'Loading...' : `${availableBalance.toFixed(8)} ${orderData.symbol.split('-')[0]}`})
                                                        </span>
                                                    )}
                                                </label>
                                                <input
                                                    type="number"
                                                    id="quantity"
                                                    required
                                                    step="0.00000001"
                                                    min="0"
                                                    placeholder="0.00000000"
                                                    value={orderData.quantity}
                                                    onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                {orderData.side === 'SELL' && !loadingBalances && (
                                                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.25).toFixed(8) })}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            25%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.5).toFixed(8) })}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            50%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderData({ ...orderData, quantity: (availableBalance * 0.75).toFixed(8) })}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            75%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderData({ ...orderData, quantity: availableBalance.toFixed(8) })}
                                                            className="hover:text-indigo-600"
                                                        >
                                                            Max
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                                    {orderData.type === 'MARKET' ? 'Market Price (USD)' : 'Price (USD)'}
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
                                                        onChange={orderData.type === 'LIMIT' ? (e) => setOrderData({ ...orderData, price: e.target.value }) : undefined}
                                                        readOnly={orderData.type === 'MARKET'}
                                                        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${orderData.type === 'MARKET' ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                                                    />
                                                    {orderData.type === 'MARKET' && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Market orders execute at the current live price
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
                                            {loading ? 'Placing Order...' : `${orderData.side} ${orderData.symbol}`}
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