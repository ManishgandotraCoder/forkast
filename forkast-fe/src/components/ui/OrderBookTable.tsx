import React from 'react';

interface Column<T = unknown> {
    key: string;
    label: string;
    render?: (value: unknown, row: T, index?: number) => React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

interface OrderBookEntry {
    price: number | string;
    quantity: number | string;
    total?: number | string;
    userName?: string;
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
    // OrderBook specific props
    isOrderBook?: boolean;
    symbol?: string;
    bids?: OrderBookEntry[];
    asks?: OrderBookEntry[];
}

const OrderBookDataTable: React.FC<OrderBookDataTableProps> = ({
    title,
    subtitle,
    loading = false,
    error = null,
    symbol,
    bids = [],
    asks = []
}) => {
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

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{title} - {symbol}</h3>
                    {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>

                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price (USD)
                            </th>

                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                            </th>

                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Asks (Sell Orders) */}
                        {asks?.slice(0, 10).reverse().map((ask, index) => (
                            <tr key={`ask-${index}`} className="hover:bg-red-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={ask.userName}>
                                    {ask.userName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                                    {formatQuantity(ask.quantity)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-red-600">
                                    {formatPrice(ask.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                    {(() => {
                                        const price = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
                                        const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
                                        return formatPrice(price * quantity);
                                    })()}
                                </td>
                            </tr>
                        ))}
                        {/* Bids (Buy Orders) */}
                        {bids?.slice(0, 10).map((bid, index) => (
                            <tr key={`bid-${index}`} className="hover:bg-green-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium truncate" title={bid.userName}>
                                    {bid.userName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                                    {formatQuantity(bid.quantity)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-green-600">
                                    {formatPrice(bid.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-600">
                                    {(() => {
                                        const price = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
                                        const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
                                        return formatPrice(price * quantity);
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {bids.length === 0 && asks.length === 0 && !loading && !error && (
                    <div className="p-6 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <title>No Data</title>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="mt-2 text-sm">No orderbook data available</p>
                        </div>
                    </div>
                )}
                {loading && (
                    <div className="p-6 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-3 text-sm">Loading orderbook...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="p-6 text-center text-red-500">
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>

        </div>
    );

};

export default OrderBookDataTable;
