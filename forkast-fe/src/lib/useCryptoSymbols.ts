import { useState, useEffect } from 'react';
import { cryptoAPI } from '@/lib/api';

interface CryptoQuote {
    symbol: string;
    price: number;
}

export function useCryptoSymbols() {
    const [cryptos, setCryptos] = useState<CryptoQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCryptos = async () => {
            try {
                const response = await cryptoAPI.getBatchQuotes();
                setCryptos(response.data);
            } catch (err) {
                setError('Failed to fetch crypto prices');
                console.error('Error fetching cryptos:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCryptos();
    }, []);

    return { cryptos, loading, error };
}
