'use client';

import { useState, useEffect } from 'react';
import { orderbookAPI } from '@/lib/api';
import { useCryptoSymbols } from '@/lib/useCryptoSymbols';
import DataTable from '../ui/DataTable';
import Pagination from '../ui/Pagination';

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

export default function OrderBook() {
    const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [symbol, setSymbol] = useState('BTC-USD');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const { cryptos: cryptoSymbols } = useCryptoSymbols();

    const fetchOrderBook = async (symbol: string) => {
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
    };

    useEffect(() => {
        if (symbol) {
            fetchOrderBook(symbol);
        }
    }, [symbol, currentPage, itemsPerPage]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (limit: number) => {
        setItemsPerPage(limit);
        setCurrentPage(1); // Reset to first page when changing items per page
    };
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Book Controls</h3>
                <div className="flex space-x-4">
                    <div>
                        <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
                            Symbol
                        </label>
                        <select
                            id="symbol"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {cryptoSymbols.map((crypto) => (
                                <option key={crypto.symbol} value={crypto.symbol}>
                                    {crypto.symbol}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-3 text-sm text-gray-500">Loading orderbook...</p>
                    </div>
                </div>
            ) : orderBook ? (
                <>
                    <DataTable
                        title={`Order Book - ${orderBook.symbol}`}
                        symbol={orderBook.symbol}
                        bids={orderBook.bids}
                        asks={orderBook.asks}
                        timestamp={orderBook.timestamp}
                        isOrderBook={true}
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
        </div>
    );
}
