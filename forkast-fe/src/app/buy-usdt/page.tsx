'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { buyUsdtAPI, usdProfileAPI } from '@/lib/api';
import { ArrowUpDown, DollarSign, AlertCircle, TrendingUp, TrendingDown, SignalHigh, CheckCircle2, X } from 'lucide-react';
import IsolatedUsdInput, { IsolatedUsdInputRef } from '@/components/ui/IsolatedUsdInput';

interface ExchangeRates {
    USD_TO_USDT: number;
    INR_TO_USDT: number;
}

interface Ticker {
    symbol: string;
    price: number;
    priceChangePercent?: number;
}

// --- Utils ---
const formatCurrency = (n: number, curr: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, maximumFractionDigits: 4 }).format(n);

const formatNumber = (n: number, fraction = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: fraction }).format(n);

const classNames = (...cx: (string | false | undefined)[]) => cx.filter(Boolean).join(' ');


export default function BuyUsdtPage() {
    // Keeping hook for potential future auth-based conditional UI
    const { } = useAuth();
    const { cryptoPrices, isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices } = useWebSocket();

    const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [addUsdAmount, setAddUsdAmount] = useState<string>('');
    const [addingUsd, setAddingUsd] = useState<boolean>(false);

    // --- Data Fetchers ---
    const fetchExchangeRates = useCallback(async () => {
        try {
            const response = await buyUsdtAPI.getExchangeRates();
            setExchangeRates(response.data);
        } catch (error: unknown) {
            console.error('Error fetching exchange rates:', error);
            setError(error instanceof Error ? error.message : 'Unable to fetch exchange rates');
        }
    }, []);


    // --- Effects ---
    useEffect(() => {
        let mounted = true;

        const boot = async () => {
            try {
                await Promise.all([fetchExchangeRates()]);
            } catch {
                // Errors are handled inside each function
            } finally {
                if (mounted) setLoading(false);
            }
        };

        boot();

        // Subscribe to WS tickers when available
        if (isConnected) {
            subscribeToCryptoPrices();
        }

        return () => {
            mounted = false;
            unsubscribeFromCryptoPrices();
        };
    }, [isConnected, subscribeToCryptoPrices, unsubscribeFromCryptoPrices, fetchExchangeRates]);

    // --- Derived values ---
    const usdtTicker: Ticker | null = useMemo(() => {
        return cryptoPrices?.find((p: Ticker) => p.symbol === 'USDT-USD') ?? null;
    }, [cryptoPrices]);

    // Memoize the onChange handler to prevent re-renders
    const handleUsdAmountChange = useCallback((value: string) => {
        setAddUsdAmount(value);
    }, []);

    // Create a stable reference for the input component
    const usdInputRef = useRef<IsolatedUsdInputRef>(null);

    const addUsdDisabled = addingUsd || !addUsdAmount || Number(addUsdAmount) <= 0;

    // --- Actions ---
    const handleAddUsd = useCallback(async () => {
        const amt = Number(addUsdAmount);
        if (!amt || amt <= 0) {
            setError('Please enter a valid USD amount');
            return;
        }

        setAddingUsd(true);
        setError('');
        setSuccess('');

        try {
            const response = await usdProfileAPI.addUsdToUser(amt);
            setSuccess(`Successfully added ${formatCurrency(response.data.amountAdded)} to your account`);
            setAddUsdAmount('');
            usdInputRef.current?.reset();
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred while adding USD');
        } finally {
            setAddingUsd(false);
        }
    }, [addUsdAmount]);

    // --- Small UI Components ---
    const LiveBadge = ({ live }: { live: boolean }) => (
        <span className={classNames(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
            live ? 'border-emerald-600 text-emerald-700' : 'border-amber-600 text-amber-700'
        )}>
            <SignalHigh className="h-3.5 w-3.5 mr-1" />
            {live ? 'Live' : 'Connecting…'}
        </span>
    );

    const Notice = ({ kind, message, onClose }: { kind: 'error' | 'success'; message: string; onClose: () => void }) => (
        <div
            role={kind === 'error' ? 'alert' : 'status'}
            className={classNames(
                'relative rounded-xl border p-4',
                kind === 'error' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
            )}
        >
            <div className="flex items-start">
                {kind === 'error' ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                )}
                <p className={classNames('ml-2', kind === 'error' ? 'text-red-700' : 'text-emerald-700')}>{message}</p>
                <button
                    onClick={onClose}
                    aria-label="Dismiss"
                    className="ml-auto rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    const Panel = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
        <div className={classNames('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
            {title && <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>}
            {children}
        </div>
    );

    const Skeleton = ({ className = '' }: { className?: string }) => (
        <div className={classNames('animate-pulse rounded-lg bg-gray-200/60', className)} />
    );

    // --- Loading screen ---
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-8">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Panel>
                        <Skeleton className="h-6 w-32 mb-4" />
                        <Skeleton className="h-12 w-full mb-4" />
                        <Skeleton className="h-10 w-40" />
                    </Panel>
                    <Panel>
                        <Skeleton className="h-6 w-32 mb-4" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full mt-3" />
                    </Panel>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <DollarSign className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Buy USDT</h1>
                                <p className="text-green-100">Add USD</p>
                            </div>
                        </div>

                        {/* Real-time USDT Price */}
                        <div className="text-right">
                            <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm min-w-[200px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-sm font-medium">USDT Price</span>
                                    <LiveBadge live={isConnected} />
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-2xl font-bold text-white">
                                        {usdtTicker ? `$${usdtTicker.price.toFixed(4)}` : '$1.0000'}
                                    </div>
                                    <div
                                        className={classNames(
                                            'ml-2 inline-flex items-center text-xs font-medium',
                                            (usdtTicker?.priceChangePercent ?? 0) >= 0 ? 'text-green-100' : 'text-red-100'
                                        )}
                                    >
                                        {(usdtTicker?.priceChangePercent ?? 0) >= 0 ? (
                                            <TrendingUp className="h-4 w-4 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 mr-1" />
                                        )}
                                        <span>{Math.abs(usdtTicker?.priceChangePercent ?? 0).toFixed(2)}%</span>
                                    </div>
                                </div>

                                <div className="text-[11px] text-green-100 mt-1">
                                    {isConnected ? 'Live via WebSocket' : 'Connecting…'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                        {/* Left: Add USD */}
                        <div className="space-y-5">
                            <h2 className="text-lg font-semibold text-gray-900">Add USD</h2>

                            <Panel>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <ArrowUpDown className="h-4 w-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-700">Exchange Rate</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {usdtTicker ? 'Updated in real time' : 'Using fallback'}
                                    </div>
                                </div>

                                {usdtTicker ? (
                                    <div className="mt-2 text-sm text-gray-700">
                                        Current USDT Price: <span className="font-semibold">${usdtTicker.price.toFixed(4)}</span>
                                        <span
                                            className={classNames(
                                                'ml-2 font-medium',
                                                (usdtTicker.priceChangePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                            )}
                                        >
                                            {(usdtTicker.priceChangePercent ?? 0) >= 0 ? '+' : ''}
                                            {(usdtTicker.priceChangePercent ?? 0).toFixed(2)}%
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-gray-700">Current USDT Price: <span className="font-semibold">$1.0000</span></div>
                                )}
                            </Panel>

                            {error && <Notice kind="error" message={error} onClose={() => setError('')} />}
                            {success && <Notice kind="success" message={success} onClose={() => setSuccess('')} />}

                            {/* <Panel title="USD Amount to Add"> */}
                            <div className="space-y-3">
                                <IsolatedUsdInput
                                    ref={usdInputRef}
                                    initialValue={addUsdAmount}
                                    onValueChange={handleUsdAmountChange}
                                    disabled={addingUsd}
                                />

                                {exchangeRates && (
                                    <div className="text-xs text-gray-600">
                                        <p>
                                            1 USD ≈ <span className="font-medium">{(1 / exchangeRates.USD_TO_USDT).toFixed(6)} USDT</span>
                                        </p>
                                        <p>
                                            1 INR ≈ <span className="font-medium">{(1 / exchangeRates.INR_TO_USDT).toFixed(6)} USDT</span>
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleAddUsd}
                                    disabled={addUsdDisabled}
                                    className={classNames(
                                        'w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200',
                                        addUsdDisabled
                                            ? 'bg-blue-600/60 text-white/80 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    )}
                                >
                                    {addingUsd ? 'Adding USD…' : 'Add USD to Account'}
                                </button>

                                {/* Estimated outcome helper */}
                                {usdtTicker && addUsdAmount && Number(addUsdAmount) > 0 && (
                                    <p className="text-xs text-gray-500">
                                        Est. you can buy about{' '}
                                        <span className="font-medium">
                                            {formatNumber(Number(addUsdAmount) / usdtTicker.price, 6)} USDT
                                        </span>{' '}
                                        at current price.
                                    </p>
                                )}
                            </div>
                            {/* </Panel> */}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
