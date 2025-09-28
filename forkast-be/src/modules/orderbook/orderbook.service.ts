import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Order, Trade } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { createOrder, getCurrentMarketPrice, handleLimitOrder, handleMarketOrder, transferBalance, validateSymbol } from './orderbook.utils';

@Injectable()
export class OrderbookService {
    protected readonly logger = new Logger(this.constructor.name);

    constructor(protected readonly prisma: PrismaService) { }

    async placeOrder(
        userId: number,
        type: 'buy' | 'sell',
        symbol: string,
        price: number,
        quantity: number,
        market: boolean,
        currentBalance?: number
    ): Promise<Order> {
        try {
            validateSymbol(symbol);

            return await this.prisma.$transaction(async (tx) => {
                const order = await createOrder(tx, userId, type, symbol, price, quantity, market);

                this.logger.log(
                    `${type.toUpperCase()} order placed: id=${order.id} userId=${userId} ${symbol} price=${price} qty=${quantity} market=${market}`
                );

                if (market) {
                    return await handleMarketOrder(tx, order, userId, symbol, quantity, price, currentBalance || 0);
                } else {
                    return await handleLimitOrder(tx, order, userId, symbol, quantity, price, type);
                }
            });
        } catch (error) {
            this.logger.error(
                `Failed to place ${type.toUpperCase()}: userId=${userId} symbol=${symbol} price=${price} qty=${quantity} market=${market}`,
                error instanceof Error ? error.stack : String(error)
            );
            throw error;
        }
    }

    async getOrderbook(userId: number, symbol?: string, page: number = 1, limit: number = 50): Promise<{
        buys: Order[];
        sells: Order[];
        pagination: {
            page: number;
            limit: number;
            totalBuys: number;
            totalSells: number;
            totalPages: number;
        }
    }> {
        const skip = (page - 1) * limit;
        console.log(userId);

        // Build where conditions for buy orders
        const buyWhere = {
            type: 'buy',
            status: 'open',
            ...(symbol && { symbol }),
            ...(userId && { userId: { not: userId } })
        };

        // Build where conditions for sell orders
        const sellWhere = {
            type: 'sell',
            status: 'open',
            ...(symbol && { symbol }),
            ...(userId && { userId: { not: userId } })
        };

        const [buys, sells, totalBuys, totalSells] = await Promise.all([
            this.prisma.order.findMany({
                where: buyWhere,
                include: { user: true },
                orderBy: { price: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.order.findMany({
                where: sellWhere,
                include: { user: true },
                orderBy: { price: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.order.count({
                where: buyWhere,
            }),
            this.prisma.order.count({
                where: sellWhere,
            }),
        ]);

        const totalPages = Math.ceil(Math.max(totalBuys, totalSells) / limit);

        return {
            buys,
            sells,
            pagination: {
                page,
                limit,
                totalBuys,
                totalSells,
                totalPages,
            }
        };
    }

    async getTradeHistory(userId?: number, page: number = 1, limit: number = 50): Promise<{
        trades: Trade[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        }
    }> {
        const skip = (page - 1) * limit;
        const where = userId ? {
            OR: [
                { buyOrder: { userId } },
                { sellOrder: { userId } }
            ]
        } : {};

        const [trades, total] = await Promise.all([
            this.prisma.trade.findMany({
                where,
                orderBy: { executedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.trade.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            trades,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            }
        };
    }

    async getMyOrders(userId: number, query?: any): Promise<{
        orders: Order[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        }
    }> {
        const where: any = { userId };
        if (query?.symbol) where.symbol = query.symbol;
        if (query?.side) where.type = query.side.toLowerCase();
        if (query?.status) where.status = query.status;

        const page = query?.page ? parseInt(query.page) : 1;
        const limit = query?.limit ? parseInt(query.limit) : 50;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.order.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            }
        };
    }

    async cancelOrder(userId: number, orderId: string): Promise<Order> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: parseInt(orderId), userId },
                });

                if (!order) {
                    throw new BadRequestException(`Order with ID ${orderId} not found`);
                }

                if (order.status !== 'open') {
                    throw new BadRequestException(`Order with ID ${orderId} cannot be cancelled. Current status: ${order.status}`);
                }

                // Calculate remaining quantity to refund
                const remainingQuantity = order.quantity - order.filledQuantity;

                if (remainingQuantity > 0) {
                    // Refund the remaining balance based on order type
                    if (order.type === 'buy') {
                        // For buy orders, refund the remaining USD amount (price * remaining quantity)
                        const refundAmount = remainingQuantity * order.price;
                        await transferBalance(tx, 0, userId, 'USD', refundAmount, refundAmount);
                    } else if (order.type === 'sell') {
                        // For sell orders, refund the remaining crypto amount
                        await transferBalance(tx, 0, userId, order.symbol, remainingQuantity, remainingQuantity * order.price);
                    }
                }

                // Update order status to cancelled
                const cancelledOrder = await tx.order.update({
                    where: { id: parseInt(orderId) },
                    data: { status: 'cancelled' },
                });

                this.logger.log(
                    `Order cancelled: id=${orderId} userId=${userId} ${order.symbol} type=${order.type} remaining=${remainingQuantity}`
                );

                return cancelledOrder;
            });
        } catch (error) {
            this.logger.error(
                `Failed to cancel order: orderId=${orderId} userId=${userId}`,
                error instanceof Error ? error.stack : String(error)
            );
            throw error;
        }
    }

}
