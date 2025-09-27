import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CryptoPriceService } from './crypto-price.service';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/crypto',
})
export class CryptoGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(CryptoGateway.name);
    private connectedClients = new Set<string>();

    constructor(private readonly cryptoPriceService: CryptoPriceService) {
        // Set up the broadcast callback to avoid circular dependency
        this.cryptoPriceService.setBroadcastCallback((prices) => {
            this.broadcastPriceUpdate(prices);
        });
    }

    handleConnection(client: Socket) {
        this.connectedClients.add(client.id);
        this.logger.log(`Client connected: ${client.id}`);
        this.logger.log(`Total connected clients: ${this.connectedClients.size}`);
    }

    handleDisconnect(client: Socket) {
        this.connectedClients.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
        this.logger.log(`Total connected clients: ${this.connectedClients.size}`);
    }

    @SubscribeMessage('subscribe-crypto-prices')
    handleSubscribeCryptoPrices(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { symbols?: string[] }
    ) {
        this.logger.log(`Client ${client.id} subscribed to crypto prices:`, data);
        client.join('crypto-prices');

        // Send current prices immediately
        const currentPrices = this.cryptoPriceService.getCurrentPrices();
        client.emit('crypto-prices-update', currentPrices);
    }

    @SubscribeMessage('unsubscribe-crypto-prices')
    handleUnsubscribeCryptoPrices(@ConnectedSocket() client: Socket) {
        this.logger.log(`Client ${client.id} unsubscribed from crypto prices`);
        client.leave('crypto-prices');
    }

    // Method to broadcast price updates to all connected clients
    broadcastPriceUpdate(prices: any[]) {
        this.server.to('crypto-prices').emit('crypto-prices-update', prices);
    }

    // Method to broadcast individual price update
    broadcastSinglePriceUpdate(symbol: string, priceData: any) {
        this.server.to('crypto-prices').emit('crypto-price-update', {
            symbol,
            ...priceData
        });
    }
}
