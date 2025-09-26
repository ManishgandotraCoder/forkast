import React from 'react';

interface Column<T = any> {
    key: string;
    label: string;
    render?: (value: any, row: T, index?: number) => React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

interface OrderBookEntry {
    price: number | string;
    quantity: number | string;
    total?: number | string;
    userName?: string;
}

interface DataTableProps<T = any> {
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

const DataTable: React.FC<DataTableProps> = ({
    title,
    subtitle,
    columns = [],
    data = [],
    loading = false,
    error = null,
    emptyMessage = "No data found",
    timestamp,
    onRowClick,
}) => {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                    {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={column.key as string || index}
                                    className={`px-6 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-red-500">
                                    {error}
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50" onClick={() => onRowClick?.(row)}>
                                    {columns.map((column, colIndex) => (
                                        <td
                                            key={column.key as string || colIndex}
                                            className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                                        >
                                            {column.render
                                                ? column.render((row as Record<string, unknown>)[column.key], row, rowIndex)
                                                : String((row as Record<string, unknown>)[column.key] ?? '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {timestamp && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                    Last updated: {new Date(timestamp).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

export default DataTable;
