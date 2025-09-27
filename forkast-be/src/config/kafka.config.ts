import { Kafka, Producer, Consumer } from 'kafkajs';

export const kafkaConfig = {
    clientId: 'forkast-trading-app',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
};

export const kafka = new Kafka(kafkaConfig);

export const createProducer = (): Producer => {
    return kafka.producer();
};

export const createConsumer = (groupId: string): Consumer => {
    return kafka.consumer({ groupId });
};

export const TOPICS = {
    CRYPTO_PRICES: 'crypto-prices',
    CRYPTO_UPDATES: 'crypto-updates',
    TRADES: 'trades',
    ORDERS: 'orders'
} as const;
