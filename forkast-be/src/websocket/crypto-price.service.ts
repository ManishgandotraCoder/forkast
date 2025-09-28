import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createProducer, TOPICS } from '../config/kafka.config';
import yahooFinance from 'yahoo-finance2';
import { cryptoList } from '../constants/crypto';

export interface CryptoPriceUpdate {
    symbol: string;
    price: number;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap: number;
    timestamp: number;
    previousPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
}

@Injectable()
export class CryptoPriceService implements OnModuleInit {
    private readonly logger = new Logger(CryptoPriceService.name);
    private producer: any = null;
    private currentPrices: Map<string, CryptoPriceUpdate> = new Map();
    private isSimulationMode = process.env.NODE_ENV !== 'production';
    private broadcastCallback: ((prices: CryptoPriceUpdate[]) => void) | null = null;

    constructor() { }

    async onModuleInit() {
        try {
            // Try to connect to Kafka, but don't fail if it's not available
            try {
                this.producer = createProducer();
                await this.producer.connect();
                this.logger.log('Kafka producer connected successfully');
            } catch (kafkaError) {
                this.logger.warn('Kafka not available, continuing without Kafka:', kafkaError.message);
                this.producer = null; // Disable Kafka functionality
            }

            // Initialize with current prices
            await this.fetchAndUpdatePrices();

            // Start price simulation if in development mode
            if (this.isSimulationMode) {
                this.logger.log('Starting price simulation mode');
                this.startPriceSimulation();
            }
        } catch (error) {
            this.logger.error('Failed to initialize crypto price service:', error);
        }
    }

    // Fetch real prices from Yahoo Finance
    async fetchRealPrices(symbols: string[]): Promise<CryptoPriceUpdate[]> {
        try {
            const quotes = await yahooFinance.quote(symbols);
            const results: CryptoPriceUpdate[] = [];

            for (const symbol of symbols) {
                try {
                    const quote = await yahooFinance.quote(symbol);
                    const priceData: CryptoPriceUpdate = {
                        symbol: String(quote.symbol),
                        price: Number(quote.regularMarketPrice || 0),
                        shortName: String(quote.shortName || ''),
                        regularMarketPrice: Number(quote.regularMarketPrice || 0),
                        regularMarketChange: Number(quote.regularMarketChange || 0),
                        regularMarketChangePercent: Number(quote.regularMarketChangePercent || 0),
                        marketCap: Number(quote.marketCap || 0),
                        timestamp: Date.now(),
                    };

                    // Calculate price change from previous price
                    const previousPrice = this.currentPrices.get(symbol);
                    if (previousPrice) {
                        priceData.previousPrice = previousPrice.price;
                        priceData.priceChange = priceData.price - previousPrice.price;
                        priceData.priceChangePercent = (priceData.priceChange / previousPrice.price) * 100;
                    }

                    results.push(priceData);
                } catch (error) {
                    this.logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
                }
            }

            return results;
        } catch (error) {
            this.logger.error('Failed to fetch real prices:', error);
            return [];
        }
    }

    // Generate simulated price updates for development
    generateSimulatedPrices(): CryptoPriceUpdate[] {
        const results: CryptoPriceUpdate[] = [];

        for (const crypto of cryptoList) {
            const previousPrice = this.currentPrices.get(crypto.symbol);
            const basePrice = previousPrice?.price || crypto.price;

            // Generate realistic price movement (-2% to +2%)
            const volatility = 0.02;
            const randomChange = (Math.random() - 0.5) * 2 * volatility;
            const newPrice = basePrice * (1 + randomChange);

            const priceChange = newPrice - basePrice;
            const priceChangePercent = (priceChange / basePrice) * 100;

            const priceData: CryptoPriceUpdate = {
                symbol: crypto.symbol,
                price: Number(newPrice.toFixed(2)),
                shortName: crypto.shortName,
                regularMarketPrice: Number(newPrice.toFixed(2)),
                regularMarketChange: Number(priceChange.toFixed(2)),
                regularMarketChangePercent: Number(priceChangePercent.toFixed(2)),
                marketCap: crypto.marketCap,
                timestamp: Date.now(),
                previousPrice: basePrice,
                priceChange: Number(priceChange.toFixed(2)),
                priceChangePercent: Number(priceChangePercent.toFixed(2)),
            };

            results.push(priceData);
        }

        return results;
    }

    // Fetch and update prices (called by cron job)
    @Cron(CronExpression.EVERY_SECOND)
    async fetchAndUpdatePrices() {
        try {
            const symbols = cryptoList.map(crypto => crypto.symbol);
            let priceUpdates: CryptoPriceUpdate[];

            if (this.isSimulationMode) {
                priceUpdates = this.generateSimulatedPrices();
            } else {
                priceUpdates = await this.fetchRealPrices(symbols);
            }

            if (priceUpdates.length > 0) {
                // Update current prices
                for (const update of priceUpdates) {
                    this.currentPrices.set(update.symbol, update);
                }

                // Broadcast to WebSocket clients
                if (this.broadcastCallback) {
                    this.broadcastCallback(Array.from(this.currentPrices.values()));
                }

                // Send to Kafka (if available)
                if (this.producer) {
                    try {
                        await this.producer.send({
                            topic: TOPICS.CRYPTO_PRICES,
                            messages: [{
                                key: 'crypto-prices',
                                value: JSON.stringify(priceUpdates),
                                timestamp: Date.now().toString(),
                            }],
                        });
                    } catch (kafkaError) {
                        this.logger.warn('Kafka publish failed:', kafkaError.message);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to fetch and update prices:', error);
        }
    }

    // Start price simulation for development
    private startPriceSimulation() {
        // Initial fetch
        this.fetchAndUpdatePrices();
    }

    // Get current prices
    getCurrentPrices(): CryptoPriceUpdate[] {
        return Array.from(this.currentPrices.values());
    }

    // Get price for specific symbol
    getPrice(symbol: string): CryptoPriceUpdate | undefined {
        return this.currentPrices.get(symbol);
    }

    // Set broadcast callback (called by gateway)
    setBroadcastCallback(callback: (prices: CryptoPriceUpdate[]) => void) {
        this.broadcastCallback = callback;
    }

    // Manual price update (for testing)
    async updatePrice(symbol: string, priceData: Partial<CryptoPriceUpdate>) {
        const current = this.currentPrices.get(symbol);
        if (current) {
            const updated = { ...current, ...priceData, timestamp: Date.now() };
            this.currentPrices.set(symbol, updated);
            if (this.broadcastCallback) {
                this.broadcastCallback(Array.from(this.currentPrices.values()));
            }
        }
    }
}
