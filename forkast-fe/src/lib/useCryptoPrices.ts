import { useState, useEffect } from 'react';
import { cryptoAPI } from '@/lib/api';

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

export function useCryptoPrices() {
    const [data, setData] = useState<CryptoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCryptoPrices = async () => {
            try {
                const response = await cryptoAPI.getBatchQuotes();
                // Add timestamp to each crypto data
                const cryptoDataWithTimestamp = response.data.map((crypto: any) => ({
                    ...crypto,
                    timestamp: Date.now(),
                }));
                setData(cryptoDataWithTimestamp);
            } catch (err) {
                setError('Failed to fetch crypto prices');
                console.error('Error fetching crypto prices:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCryptoPrices();
    }, []);

    return { data, loading, error };
}
